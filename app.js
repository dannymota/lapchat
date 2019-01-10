var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('client-sessions');
var sass = require("node-sass");
var mongodb = require('mongodb');
var sassMiddleware = require('node-sass-middleware');
var mongo = require('mongodb')
var routes = require('./routes/index');
var users = require('./routes/users');
var express = require('express'),
    http = require('http');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
server.listen(3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(sassMiddleware({
    src: __dirname + '/public/sass',
    dest: __dirname + '/public',
    debug: false,
    outputStyle: 'compressed'
}));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser({
    limit: '50mb'
}));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    cookieName: 'session',
    secret: 'eg[isfd-8yF9-7w2315df{}+Ijsli;;to8',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    httpOnly: true,
    secure: true,
    ephemeral: true
}))
io.enable('browser client minification');
io.enable('browser client etag');
io.enable('browser client gzip');
io.set("log level", 2);
var username;
var usersList = {};
var usersListr = {};
var publicRoomsList = ["Lobby"];
var login_page = 'winning.jade';
var main_page = 'main.jade';
var numConnected = 0;
io.sockets.on("connection", function(socket) {
    console.log("test");
    try {
        username = socket.handshake.query.username;
        console.log(logStr() + "User " + username + " is connecting");
        if (!isValidString(username) || usersListr[username]) {
            console.log(logStr() + "Kicking user: " + username + " due to duplicate/invalid username");
            socket.emit("kickClient", {
                "url": "/error2"
            });
        } else if (typeof username !== "undefined" && typeof username != null) {
            socket.emit("deleteTabs");
            socket.set("username", username);
            usersList[socket.id] = username;
            usersListr[username] = socket.id;
            numConnected++;
            console.log(logStr() + "User " + username + " connected");
            console.log(logStr() + "usersList is: " + JSON.stringify(usersList));
            console.log(logStr() + numConnected + " connected");
            socket.emit("saveUsername", {
                "clientUsername": username
            });
            var initialUsernamesList = getUsernamesList("Lobby");
            io.sockets.emit("loadUsersList", {
                "roomName": "Lobby",
                "usernamesList": initialUsernamesList,
                "allUsernamesList": initialUsernamesList
            });
            io.sockets.emit("numConnected", {
                "roomName": "Lobby",
                "numConnected": numConnected
            });
            socket.emit("initRoomsList", getUserRoomList(socket), publicRoomsList);
        } else {
            console.log(logStr() + "Kicking user: " + username + " due to server restart");
            socket.emit("kickClient", {
                "url": "/error1"
            });
        }
    } catch (err) {
        console.log(logStr() + err);
    }
    socket.on("sendMessage", function(data) {
        try {
            if (data.messageRoom == "Lobby" || io.roomClients[socket.id]["/" + data.messageRoom]) {
                socket.get("username", function(error, username) {
                    var response = {
                        "message": data.messageBody,
                        "username": username,
                        "roomName": data.messageRoom
                    };
                    if (data.messageRoom == "Lobby") {
                        socket.broadcast.to("").emit("sendMessageResponse", response);
                    } else {
                        socket.broadcast.to(data.messageRoom).emit("sendMessageResponse", response);
                    }
                    console.log(logStr() + "User " + username + " send this : " + data.messageBody + " to room: " + data.messageRoom);
                });
            } else {
                console.log(logStr() + "User: " + usersList[socket.id] + " tried to spoof sendMessage! Data: " + JSON.stringify(data));
            }
        } catch (err) {
            console.log(logStr() + err);
        }
    });
    socket.on("createRoom", function(data) {
        try {
            if (typeof data.roomName === "string" && typeof data.isPublic === "boolean") {
                socket.get("username", function(error, username) {
                    var created = false;
                    var errorCode = 0;
                    var roomName = data.roomName.trim();
                    if (!isValidString(roomName)) {
                        errorCode = 1;
                    } else if (typeof io.sockets.manager.rooms["/" + roomName] !== "undefined") {
                        errorCode = 2;
                    } else if (roomName == "Lobby") {
                        errorCode = 3;
                    } else {
                        console.log(logStr() + "User " + username + " created room name: '" + roomName + "', isPublic: " + data.isPublic);
                        created = true;
                    }
                    if (created) {
                        if (data.isPublic) {
                            publicRoomsList.push(roomName);
                            io.sockets.emit("populatePublicRooms", {
                                "publicRoomsList": publicRoomsList
                            });
                        }
                        socket.emit("joinRoomResponse", {
                            "created": created,
                            "roomName": roomName,
                            "errorCode": errorCode
                        });
                        socket.join(roomName);
                        io.sockets.in(roomName).emit("loadUsersList", {
                            "roomName": roomName,
                            "usernamesList": getUsernamesList(roomName)
                        });
                        io.sockets.in(roomName).emit("numConnected", {
                            "roomName": roomName,
                            "numConnected": io.sockets.clients(roomName).length
                        }); //number of clients in a room
                        console.log(logStr() + "Added user: " + username + " to room: " + roomName);
                        console.log(logStr() + "User: " + username + " is in rooms: " + JSON.stringify(io.roomClients[socket.id]));
                    } else {
                        console.log(logStr() + "Cannot create room! Error code: " + errorCode + " Data: " + JSON.stringify(data));
                        socket.emit("joinRoomResponse", {
                            "created": created,
                            "errorCode": errorCode
                        });
                    }
                });
            } else {
                console.log(logStr() + "Room name or isPublic isn't of the correct types! " + JSON.stringify(data));
            }
        } catch (err) {
            console.log(logStr() + err);
        }
    });
    socket.on("joinRoom", function(data) {
        try {
            if (!io.roomClients[socket.id]["/" + data.roomName]) {
                var index = publicRoomsList.indexOf(data.roomName);
                if (index != -1 || socket.roomInvited == data.roomName) {
                    if (data.hasAccepted) {
                        socket.get("username", function(error, username) {
                            socket.emit("joinRoomResponse", {
                                "created": true,
                                "roomName": data.roomName,
                                "errorCode": 0
                            });
                            socket.join(data.roomName);
                            io.sockets.in(data.roomName).emit("loadUsersList", {
                                "roomName": data.roomName,
                                "usernamesList": getUsernamesList(data.roomName)
                            });
                            io.sockets.in(data.roomName).emit("numConnected", {
                                "roomName": data.roomName,
                                "numConnected": io.sockets.clients(data.roomName).length
                            });
                            number of clients in a room //
                            console.log(logStr() + "Added user: " + username + " to room: " + data.roomName);
                            console.log(logStr() + "User: " + username + " is in rooms: " + JSON.stringify(io.roomClients[socket.id]));
                        });
                    }
                    socket.roomInvited = null;
                } else {
                    console.log(logStr() + "User: " + usersList[socket.id] + " tried to spoof joinRoom! Tried to join room: " + JSON.stringify(data));
                    console.log("Index is: " + index);
                    console.log("socket.roomInvited is: " + socket.roomInvited);
                }
            } else {
                console.log(logStr() + "User: " + usersList[socket.id] + " cannot join room: " + data.roomName + " because user is already in room.");
            }
        } catch (err) {
            console.log(logStr() + err);
        }
    });
    socket.on("leaveRoom", function(roomName) {
        try {
            if (io.roomClients[socket.id]["/" + roomName]) {
                socket.get("username", function(error, username) {
                    socket.leave(roomName);
                    io.sockets.in(roomName).emit("loadUsersList", {
                        "roomName": roomName,
                        "usernamesList": getUsernamesList(roomName)
                    });
                    io.sockets.in(roomName).emit("numConnected", {
                        "roomName": roomName,
                        "numConnected": io.sockets.clients(roomName).length
                    }); //number of clients in a room
                    console.log(logStr() + "Removed user: " + username + " from room: " + roomName);
                    console.log(logStr() + "User: " + username + " is in rooms: " + JSON.stringify(io.roomClients[socket.id]));
                    if (io.sockets.clients(roomName).length == 0) {
                        var index = publicRoomsList.indexOf(roomName);
                        if (index != -1) {
                            publicRoomsList.splice(index, 1);
                            io.sockets.emit("populatePublicRooms", {
                                "publicRoomsList": publicRoomsList
                            });
                        }
                    }
                });
            } else {
                console.log(logStr() + "User: " + usersList[socket.id] + " tried to spoof leaveRoom! Data: " + JSON.stringify(roomName));
            }
        } catch (err) {
            console.log(logStr() + err);
        }
    });
    socket.on("inviteUser", function(data) {
        try {
            if (typeof data.roomName === "string") {
                data.roomName = data.roomName.trim();
                if (io.roomClients[socket.id]["/" + data.roomName]) {
                    socket.get("username", function(error, username) {
                        if (usersListr[data.username] && !io.sockets.manager.roomClients[usersListr[data.username]]["/" + data.roomName]) {
                            io.sockets.socket(usersListr[data.username]).roomInvited = data.roomName;
                            io.sockets.socket(usersListr[data.username]).emit("roomInvite", {
                                "inviter": username,
                                "roomName": data.roomName
                            });
                            console.log(logStr() + "User: " + username + " invited user: " + data.username + " to room: " + data.roomName);
                        } else {
                            console.log(logStr() + "Cannot invite user: " + data.username + " to room: " + data.roomName);
                            socket.emit("failedInvitation", {
                                "invitee": data.username,
                                "roomName": data.roomName
                            });
                        }
                    });
                } else {
                    console.log(logStr() + "User: " + usersList[socket.id] + " tried to spoof inviteUser! Data: " + JSON.stringify(data));
                }
            } else {
                console.log(logStr() + "Room name isn't of the correct type! " + JSON.stringify(data));
            }
        } catch (err) {
            console.log(logStr() + err);
        }
    });
    socket.on("disconnect", function() {
        try {
            if (usersList.hasOwnProperty(socket.id)) {
                socket.get("username", function(error, username) {
                    console.log(logStr() + "User " + username + " has disconnected");
                    console.log(logStr() + "usersList was " + JSON.stringify(usersList));
                    delete usersListr[usersList[socket.id]]
                    delete usersList[socket.id];
                    console.log(logStr() + "usersList is now " + JSON.stringify(usersList));
                    numConnected--;
                    io.sockets.emit("numConnected", {
                        "roomName": "Lobby",
                        "numConnected": numConnected
                    });
                    console.log(logStr() + "Number of users left on the service: " + numConnected);
                    socket.leave("");
                    var usernamesList = getUsernamesList("Lobby");
                    io.sockets.emit("loadUsersList", {
                        "roomName": "Lobby",
                        "usernamesList": usernamesList,
                        "allUsernamesList": usernamesList
                    });
                    for (room in io.sockets.manager.roomClients[socket.id]) {
                        socket.leave(room.substring(1));
                        io.sockets.emit("loadUsersList", {
                            "roomName": room.substring(1),
                            "usernamesList": getUsernamesList(room.substring(1)),
                            "allUsernamesList": usernamesList
                        });
                        io.sockets.in(room.substring(1)).emit("numConnected", {
                            "roomName": room.substring(1),
                            "numConnected": io.sockets.clients(room.substring(1)).length
                        }); //number of clients in a room
                        //remove public room if no one is left in a public room
                        if (io.sockets.clients(room).length == 0) {
                            var index = publicRoomsList.indexOf(room.substring(1));
                            if (index != -1) {
                                publicRoomsList.splice(index, 1);
                                //update public rooms list
                            }
                        }
                    }
                    io.sockets.emit("populatePublicRooms", {
                        "publicRoomsList": publicRoomsList
                    });
                });
            }
        } catch (err) {
            console.log(logStr() + err);
        }
    });
});

function logStr() {
    return "uwcr - " + new Date().toUTCString() + " - ";
}

function isValidString(string) {
    if (string) {
        return /^[a-zA-Z0-9_ ]*$/.test(string);
    }
    return false;
}

function getUsernamesList(room) {
    try {
        var usernamesList = new Array();
        if (room == "Lobby" || room == "") {
            for (var i = 0; i < io.sockets.clients().length; i++) {
                if (usersList[io.sockets.clients()[i].id]) {
                    usernamesList.push(usersList[io.sockets.clients()[i].id]);
                }
            }
        } else {
            for (var i = 0; i < io.sockets.clients(room).length; i++) {
                if (usersList[io.sockets.clients()[i].id]) {
                    usernamesList.push(usersList[io.sockets.clients(room)[i].id]);
                }
            }
        }
    } catch (err) {
        console.log(logStr() + err);
    } finally {
        return usernamesList;
    }
}

function getUserRoomList(socket) {
    try {
        var roomList = new Array();
        for (room in io.sockets.manager.roomClients[socket.id]) {
            if (room == "") {
                roomList.push("Lobby");
            } else {
                roomList.push(room.substring(1));
            }
        }
    } catch (err) {
        console.log(logStr() + err);
    } finally {
        return roomList;
    }
}
app.post("/main", function(req, res) {
    try {
        console.log(logStr() + "POST Request made to " + "/main");
        username = req.body.username.trim();
        if (isValidString(username)) {
            console.log(logStr() + "Setting cookie for username: " + username);
            res.cookie("uwcr", username, {
                maxAge: 60 * 60 * 1000
            });
        }
        if (isValidString(username) && !usersListr[username]) {
            console.log(logStr() + "User logged in as '" + username + "'");
            res.render(main_page, {
                "username": username
            });
        } else {
            res.render(login_page, {
                "usernameInvalid": true
            });
        }
    } catch (err) {
        console.log(logStr() + err);
        res.render(login_page);
    }
});
app.get("/error1", function(req, res) {
    res.redirect('/dashboard')
});
app.get("/error2", function(req, res) {
    res.redirect('/dashboard')
});
app.get("/chat", function(req, res) {
    if (req.headers["user-agent"] && req.headers["user-agent"] !== "Ruby") {
        var MongoClient = mongodb.MongoClient;
        var url = 'mongodb://admin:admin1@ds153394.mlab.com:53394/lapchat';
        MongoClient.connect(url, function(err, db) {
            if (err) {
                console.log('Unable to connect to the Server:', err);
            } else {
                var user = db.collection('login');
                if (req.session && req.session.user) {
                    user.findOne({
                        email: req.session.user.email
                    }, function(err, user) {
                        if (!user) {
                            req.session.reset();
                            res.redirect('/login');
                        } else {
                            if (user.role == "admin") {
                                res.render(main_page, {
                                    "username": req.session.user.username,
                                    "user": user,
                                    message: true
                                });
                            } else {
                                res.render(main_page, {
                                    "username": req.session.user.username,
                                    "user": user,
                                    message: false
                                });
                            }
                        }
                    });
                } else {
                    res.redirect('/login');
                }
            }
        });
    } else {
        res.redirect('/dashboard');
    }
});
app.use('/', routes);
app.use('/users', users);
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});
module.exports = app;