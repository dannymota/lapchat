var express = require('express');
var router = express.Router();
var mongodb = require('mongodb');
var dateTime = require('node-datetime');
const bcrypt = require('bcrypt');
router.get('/', function(req, res, next) {
    res.render('index', {
        title: 'Lapchat'
    });
});
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}
router.get('/thelist', function(req, res) {
    var MongoClient = mongodb.MongoClient;
    var url = 'mongodb://admin:admin1@ds153394.mlab.com:53394/lapchat';
    MongoClient.connect(url, function(err, db) {
        if (err) {
            console.log('Unable to connect to the Server', err);
        } else {
            console.log('Connection established to', url);
            var collection = db.collection('students');
            collection.find({}).toArray(function(err, result) {
                if (err) {
                    res.send(err);
                } else if (result.length) {
                    res.render('studentlist', {
                        "studentlist": result
                    });
                } else {
                    res.send('No documents found');
                }
                db.close();
            });
        }
    });
});
router.get('/userlist', function(req, res) {
    var MongoClient = mongodb.MongoClient;
    var url = 'mongodb://admin:admin1@ds153394.mlab.com:53394/lapchat';
    MongoClient.connect(url, function(err, db) {
        if (err) {
            console.log('Unable to connect to the Server', err);
        } else {
            console.log('Connection established to', url);
            var collection = db.collection('login');
            collection.find({}).toArray(function(err, result) {
                if (err) {
                    res.send(err);
                } else if (result.length) {
                    res.render('userlist', {
                        "studentlist": result
                    });
                } else {
                    res.send('No documents found');
                }
                db.close();
            });
        }
    });
});
router.get('/newstudent', function(req, res) {
    res.render('newstudent', {
        title: 'Add Student'
    });
});
router.post('/addstudent', function(req, res) {
    var MongoClient = mongodb.MongoClient;
    var url = 'mongodb://admin:admin1@ds153394.mlab.com:53394/lapchat';
    MongoClient.connect(url, function(err, db) {
        if (err) {
            console.log('Unable to connect to the Server:', err);
        } else {
            console.log('Connected to Server');
            var collection = db.collection('students');
            var student1 = {
                student: req.body.student,
                street: req.body.street,
                city: req.body.city,
                state: req.body.state,
                sex: req.body.sex,
                gpa: req.body.gpa
            };
            collection.insert([student1], function(err, result) {
                if (err) {
                    console.log(err);
                } else {
                    res.redirect("thelist");
                }
                db.close();
            });
        }
    });
});
router.post('/sendthatpic', function(req, res) {
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
                        console.log("Stopped exploit!");
                    } else {
                        if (req.body.pictureidhere === "meme") {
                            res.redirect('/dashboard');
                        } else {
                            var register1 = {};
                            if (req.session.user.friends.length != 0) {
                                for (var a = 0; a < req.session.user.friends.length; a++) {
                                    var register1 = {
                                        user: req.session.user.username,
                                        user_rec: req.session.user.friends[a],
                                        photo: req.body.pictureidhere
                                    };
                                    console.log(register1);
                                    db.collection('pictures').insert([register1], function(err, result) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            db.close();
                                            res.redirect("/dashboard");
                                        }
                                    });
                                }
                            } else {
                                res.redirect('/dashboard');
                            }
                        }
                    }
                });
            } else {
                res.redirect('/dashboard');
            }
        }
    });
});
router.get('/sendthatpic', function(req, res) {
    res.redirect('dashboard');
});
router.post('/register', function(req, res) {
    var MongoClient = mongodb.MongoClient;
    var url = 'mongodb://admin:admin1@ds153394.mlab.com:53394/lapchat';
    MongoClient.connect(url, function(err, db) {
        if (err) {
            console.log('Unable to connect to the Server:', err);
        } else {
            console.log('Connected to Server');
            var collection = db.collection('login');
            var role = "user";
            var fixeduser = req.body.username.toLowerCase();
            var first = req.body.firstname.toLowerCase();
            var second = req.body.lastname.toLowerCase();
            var dt = dateTime.create();
            var formatted = dt.format('Y-m-d H:M:S');
            var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
            let hash = bcrypt.hashSync(req.body.password, 10);
            var register1 = {
                firstname: first.capitalize(),
                lastname: second.capitalize(),
                username: fixeduser,
                password: hash,
                email: req.body.email,
                ip: ip,
                friends: [],
                friend_req: [],
                role: role,
                date: formatted,
            };
            if (req.body.username != "" && req.body.email != "" && req.body.password != "") {
                collection.findOne({
                    "username": req.body.username
                }, function(err, user) {
                    if (!user) {
                        collection.insert([register1], function(err, result) {
                            if (err) {
                                console.log(err);
                            } else {
                                db.close();
                                res.redirect("login");
                            }
                        });
                    } else {
                        res.render('login.jade', {
                            erd: 'Username taken!',
                            message: false
                        });
                        db.close()
                    }
                });
            } else {
                res.render('login.jade', {
                    erd: 'Fill in all fields!',
                    message: false
                });
                db.close()
            }
        }
    });
});
router.get('/login', function(req, res) {
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
                        console.log("Loading login");
                        req.session.reset();
                        res.render('login.jade', {
                            message: true
                        });
                    } else {
                        console.log("Loading user");
                        res.locals.user = user;
                        res.redirect('/dashboard')
                    }
                });
            } else {
                res.render('login.jade', {
                    message: true
                });
            }
        }
    });
});
router.get('/register', function(req, res) {
    res.render('login.jade', {
        message: false
    })
});
router.post('/login', function(req, res) {
    var MongoClient = mongodb.MongoClient;
    var url = 'mongodb://admin:admin1@ds153394.mlab.com:53394/lapchat';
    MongoClient.connect(url, function(err, db) {
        if (err) {
            console.log('Unable to connect to the Server:', err);
        } else {
            console.log('Connected to Server');
            var user = db.collection('login');
            user.findOne({
                "username": req.body.username.toLowerCase()
            }, function(err, user) {
                if (!user) {
                    console.log("Could not find user!")
                    res.render('login.jade', {
                        er: 'Invalid username or password.',
                        message: true
                    });
                } else {
                    console.log("Found user!");
                    bcrypt.compare(req.body.password, user.password, function(err, work) {
                        if (work) {
                            req.session.user = user;
                            res.redirect('/dashboard');
                        } else {
                            res.render('login.jade', {
                                er: 'Invalid username or password.',
                                message: true
                            });
                        }
                    });
                }
            });
        }
    });
});
router.get('/logout', function(req, res) {
    req.session.reset();
    console.log("Session Reset!");
    res.redirect('/login');
});
router.get('/dashboard', function(req, res) {
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
                            db.collection('pictures').find({
                                "user_rec": req.session.user.username
                            }).toArray(function(err, picture) {
                                if (picture && picture != undefined && picture != null) {
                                    res.render('dashboard.jade', {
                                        user: user,
                                        message: true,
                                        picture: picture
                                    });
                                } else {
                                    res.render('dashboard.jade', {
                                        user: user,
                                        message: true,
                                        picture: {
                                            photo: "No!",
                                            user: "From: no-one"
                                        }
                                    });
                                }
                            });
                        } else {
                            db.collection('pictures').find({
                                "user_rec": req.session.user.username
                            }).toArray(function(err, picture) {
                                if (picture && picture != undefined && picture != null) {
                                    res.render('dashboard.jade', {
                                        user: user,
                                        message: false,
                                        picture: picture
                                    });
                                } else {
                                    res.render('dashboard.jade', {
                                        user: user,
                                        message: false,
                                        picture: {
                                            photo: "No!",
                                            user: "From: no-one"
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            } else {
                res.redirect('/login');
            }
        }
    });
});
router.post('/admin', function(req, res) {
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
                        console.log("Stopped exploit!");
                    } else {
                        var person = req.body.username;
                        if (req.body.username != "") {
                            db.collection('login').findOne({
                                "username": person
                            }, function(err, user) {
                                if (user) {
                                    db.collection('login').deleteOne({
                                        username: person.toLowerCase()
                                    });
                                    res.render('admin', {
                                        mess: person.toLowerCase().capitalize() + ' has been banned!'
                                    });
                                } else {
                                    res.render('admin.jade', {
                                        mess: 'User not found!'
                                    });
                                    db.close()
                                }
                            });
                        } else {
                            res.render('admin.jade', {
                                mess: 'Fill in all fields!'
                            });
                            db.close()
                        }
                    }
                });
            } else {
                res.redirect('/login');
            }
        }
    });
});
router.post('/makeadmin', function(req, res) {
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
                        console.log("Stopped exploit!");
                    } else {
                        var person = req.body.adminname
                        if (req.body.username != "") {
                            db.collection('login').findOne({
                                "username": person
                            }, function(err, user) {
                                if (user) {
                                    db.collection('login').update({
                                        "username": person.toLowerCase()
                                    }, {
                                        $set: {
                                            role: "admin"
                                        }
                                    })
                                    res.render('admin', {
                                        mess: person.toLowerCase().capitalize() + ' has been made an admin!'
                                    });
                                } else {
                                    res.render('admin.jade', {
                                        mess: 'User not found!'
                                    });
                                    db.close()
                                }
                            });
                        } else {
                            res.render('admin.jade', {
                                mess: 'Fill in all fields!'
                            });
                            db.close()
                        }
                    }
                });
            } else {
                res.redirect('/login');
            }
        }
    });
});
router.get('/ban', function(req, res) {
    res.redirect('/admin');
});
router.get('/friendreq', function(req, res) {
    res.redirect('/profile');
});
router.post('/acceptreq', function(req, res) {
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
                        console.log("Stopped exploit!");
                    } else {
                        db.collection('login').update({
                            "username": req.session.user.username
                        }, {
                            $push: {
                                "friends": req.body.username_acc
                            }
                        });
                        db.collection('login').update({
                            "username": req.body.username_acc
                        }, {
                            $push: {
                                "friends": req.session.user.username
                            }
                        });
                        db.collection('login').update({
                            "username": req.session.user.username
                        }, {
                            $pull: {
                                "friend_req": req.body.username_acc
                            }
                        });
                        res.redirect('/profile');
                    }
                });
            } else {
                res.redirect('/login');
            }
        }
    });
});
router.post('/rejectreq', function(req, res) {
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
                        console.log("Stopped exploit!");
                    } else {
                        db.collection('login').update({
                            "username": req.session.user.username
                        }, {
                            $pull: {
                                "friend_req": req.body.username_rej
                            }
                        });
                        res.redirect('/profile');
                    }
                });
            } else {
                res.redirect('/login');
            }
        }
    });
});
router.get('/friendreq', function(req, res) {
    res.redirect('/profile');
});
router.get('/acceptreq', function(req, res) {
    res.redirect('/dashboard');
});
router.get('/rejectreq', function(req, res) {
    res.redirect('/dashboard');
});
router.post('/friendreq', function(req, res) {
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
                        console.log("Stopped exploit!");
                    } else {
                        var person = req.body.friendusername;
                        if (req.body.username != "") {
                            db.collection('login').findOne({
                                "username": person
                            }, function(err, user) {
                                var bool = true;
                                if (user) {
                                    var friend_req = user.friend_req;
                                    if (user.friend_req.length != 0 && person != req.session.user.username) {
                                        for (var a = 0; a < user.friend_req.length; a++) {
                                            if (user.friend_req[a] === req.session.user.username) {
                                                bool = false;
                                            }
                                        }
                                        if (bool) {
                                            db.collection('login').update({
                                                "username": req.body.friendusername
                                            }, {
                                                $push: {
                                                    "friend_req": req.session.user.username
                                                }
                                            });
                                        }
                                    } else {
                                        if (person != req.session.user.username) {
                                            db.collection('login').update({
                                                "username": req.body.friendusername
                                            }, {
                                                $push: {
                                                    "friend_req": req.session.user.username
                                                }
                                            });
                                        }
                                    }
                                    res.redirect('/profile')
                                } else {
                                    res.redirect('/profile');
                                    db.close()
                                }
                            });
                        } else {
                            res.redirect('/profile');
                            db.close()
                        }
                    }
                });
            } else {
                res.redirect('/login');
            }
        }
    });
});
router.get('/admin', function(req, res) {
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
                        res.redirect('/login');
                    } else {
                        if (req.session.user.role === 'admin') {
                            res.render('admin');
                        } else {
                            res.redirect('/dashboard');
                        }
                    }
                });
            } else {
                res.redirect('/login');
            }
        }
    });
});
router.get('/adminlist', function(req, res) {
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
                        res.redirect('/login');
                    } else {
                        if (req.session.user.role === 'admin') {
                            db.collection('login').find({}).toArray(function(err, result) {
                                if (err) {
                                    res.send(err);
                                } else if (result.length) {
                                    res.render('userlist', {
                                        "studentlist": result,
                                        "adminname": req.session.user.firstname
                                    });
                                } else {
                                    res.send('No documents found');
                                }
                                db.close();
                            });
                        } else {
                            res.redirect('/dashboard');
                        }
                    }
                });
            } else {
                res.redirect('/login');
            }
        }
    });
});
router.get('/profile', function(req, res, next) {
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
                            res.locals.user = user;
                            res.render('profile.jade', {
                                user: user,
                                message: true
                            });
                        } else {
                            res.locals.user = user;
                            res.render('profile.jade', {
                                user: user,
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
});
module.exports = router;