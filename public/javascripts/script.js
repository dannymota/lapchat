var socket = io.connect("", {
  query: "username=" + username
});
var userRoomsList;
var currentRoom;
var myUsername;

function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function toClassString(str) {
  return str.replace(/\s/g, "-");
}

function toClassStringr(str) {
  return str.replace(/-/g, " ");
}

function addMessage(msg, roomName, username, other) {
  var roomNameClass = toClassString(roomName);
  if (currentRoom != roomName) {
    var index = userRoomsList.map(function(e) {
      return e.roomName;
    }).indexOf(roomName);
    userRoomsList[index].numNewMsgs++;
    if ($('#' + roomNameClass + '-badge').is(":hidden")) {
      $('#' + roomNameClass + '-badge').parent().addClass("tab-badge-notification-bg");
      $('#' + roomNameClass + '-badge').show();
    }
    $('#' + roomNameClass + '-badge').text(userRoomsList[index].numNewMsgs);
  }
  var time = new Date();
  var hour = time.getHours();
  var minute = time.getMinutes();
  var second = time.getSeconds();
  var sign = "am";
  if (hour > 11) {
    sign = "pm";
    if (hour > 12) {
      hour = hour % 12;
    }
  } else if (hour == 0) {
    hour = 12;
  }
  if (minute < 10) {
    minute = "0" + minute;
  }
  if (second < 10) {
    second = "0" + second;
  }
  time = hour + ":" + minute + ":" + second + " " + sign;
  var bgCSSClass = other ? "bg-info" : "bg-primary";
  $('div#chat-panel div#room-' + roomNameClass + ' div.chat-entries').append('<div class="message ' + bgCSSClass + '"><span class="msg-user">' + username + '</span> : <span class="msg-content">' + message + '</span>' + '<span class="message-timestamp">' + time + '</span>' + '</div>');
  var roomChatEntries = $('div#chat-panel div#room-' + roomNameClass + ' div.chat-entries');
  if (Math.abs((roomChatEntries[0].scrollHeight - roomChatEntries.scrollTop() - roomChatEntries.outerHeight())) < $("#chat-panel").height() + 200) {
    roomChatEntries.animate({
      scrollTop: roomChatEntries[0].scrollHeight
    }, 200);
  } else {
    $('#more-msgs').filter(':hidden').fadeIn(500).delay(1500).fadeOut(500);
  }
  emojify.run();
}

function sentMessage() {
  if ($('#message-input').val() != "") {
    var messageBody = $('#message-input').val();
    var data = {
      "messageBody": messageBody,
      "messageRoom": currentRoom
    };
    socket.emit('sendMessage', data);
    addMessage(messageBody, currentRoom, "Me", false);
    $('#message-input').val('');
  }
}

function populatePublicRoomsList(data) {
  $('#public-rooms-list').empty();
  for (var i = 0; i < data.publicRoomsList.length; i++) {
    $('#public-rooms-list').append('<div class="public-room-entry" id=' + toClassString(data.publicRoomsList[i]) + '-public-room><span class="glyphicon glyphicon-home public-room-icon"></span>' + data.publicRoomsList[i] + '</div>');
    var publicRoomElement = $('div.public-room-entry:contains(' + data.publicRoomsList[i] + ')');
    publicRoomElement.on({
      click: function(e) {
        var roomName = this.id;
        var index = roomName.indexOf("-public-room");
        var roomName = roomName.slice(0, index);
        roomName = toClassStringr(roomName);
        var index = userRoomsList.map(function(e) {
          return e.roomName;
        }).indexOf(roomName);
        if (index == -1) {
          socket.emit("joinRoom", {
            "roomName": roomName,
            "hasAccepted": true
          });
        } else {
          $('a[href="#room-' + toClassString(roomName) + '"]').click();
        }
      }
    });
  }
}
socket.on('disconnect', function(data) {
  socket.socket.reconnect();
});
socket.on('kickClient', function(data) {
  window.location.href = data.url;
});
socket.on('sendMessageResponse', function(data) {
  addMessage(data['message'], data['roomName'], data['username'], true);
});
socket.on('numConnected', function(data) {
  if (data.roomName == "Lobby") {
    $('#num-connected-Lobby').html('Online: ' + data.numConnected);
  } else {
    $('#num-connected-' + toClassString(data.roomName)).html('Users in room: ' + data.numConnected);
  }
});
socket.on('initRoomsList', function(roomsList, publicRoomsList) {
  userRoomsList = [{
    'roomName': roomsList[0],
    numNewMsgs: 0
  }];
  $('#public-rooms-title').text("Public Rooms:");
  populatePublicRoomsList({
    "publicRoomsList": publicRoomsList
  });
});
socket.on('saveUsername', function(data) {
  myUsername = data.clientUsername;
});
socket.on('loadUsersList', function(data) {
  var roomNameClass = toClassString(data.roomName);
  $('#usersList-' + roomNameClass).empty();
  if (data.roomName == "Lobby") {
    $('#all-users-list').empty();
    if (data.usernamesList.length == 1) {
      $('#all-users-list').append("There's no one on!");
    }
  }
  $('#usersList-' + roomNameClass).append('<div class="my-username">' + myUsername + " (You)" + '</div>');
  for (var i = 0; i < data.usernamesList.length; i++) {
    if (data.usernamesList[i] != myUsername) {
      $('#usersList-' + roomNameClass).append('<li>' + data.usernamesList[i] + '</li>' + '</div>');
      if (data.roomName == "Lobby") {
        $('#all-users-list').append('<li>' + data.usernamesList[i] + '</li>' + '</div>');
        $('#all-users-list div.username:contains(' + '<li>' + data.usernamesList[i] + '</li>' + ')').click(function(e) {
          socket.emit('inviteUser', {
            'username': $(this).text(),
            'roomName': currentRoom
          });
        });
      }
    }
  }
  if (typeof data.allUsernamesList !== "undefined") {
    if (data.allUsernamesList.length == 1) {
      $('#create-room-modal-invite-user-container').empty();
      $('#create-room-modal-invite-user-container').append("There's no one on!");
    } else {
      $('#create-room-modal-invite-user-container').empty();
      for (var i = 0; i < data.allUsernamesList.length; i++) {
        if (data.allUsernamesList[i] != myUsername) {
          $('#create-room-modal-invite-user-container').append('<div class="create-room-modal-username" data-username="' + data.allUsernamesList[i] + '" data-selected="false"> <span class="glyphicon glyphicon-user"></span>' + data.allUsernamesList[i] + '</div>');
        }
      }
      $('div.create-room-modal-username').click(function() {
        if ($(this).data("selected") == "true") {
          $(this).removeClass("create-room-modal-username-selected");
          $(this).data("selected", "false");
        } else {
          $(this).addClass("create-room-modal-username-selected");
          $(this).data("selected", "true");
        }
      });
    }
  }
});
socket.on('roomInvite', function(data) {
  $('#invitation-modal>div>div>div.modal-body').text("User " + data.inviter + " has invited you to " + data.roomName);
  $('#invitation-modal-accept-button').data("roomName", data.roomName);
  $('#invitation-modal').modal('show');
});
socket.on('joinRoomResponse', function(data) {
  if (data.created) {
    userRoomsList.push({
      'roomName': data.roomName,
      'numNewMsgs': 0
    });
    var roomNameClass = toClassString(data.roomName);
    $('div#chat-panel').append('<div id="room-' + roomNameClass + '" class="tab-pane"><div class="chat-entries"></div></div>');
    $('div#num-connected-container').append('<div id="num-connected-' + roomNameClass + '" class="num-connected"></div>');
    $('div#username-container').append('<div id="usersList-' + roomNameClass + '" class="usersList"></div>')
    $('ul#tab').append('<li class="span roomTab"><a href="#room-' + roomNameClass + '" data-toggle="tab">' + '<span id = "' + roomNameClass + '-badge" class="badge tab-badge"></span>' + data.roomName + '<span class="glyphicon glyphicon-remove"></span></a></li>');
    $('ul#tab li:contains(' + data.roomName + ') a').click(function(e) {
      e.preventDefault();
      $(this).tab('show');
      $('div.usersList').hide();
      $('div#usersList-' + roomNameClass).show();
      currentRoom = data.roomName;
      var index = userRoomsList.map(function(e) {
        return e.roomName;
      }).indexOf(currentRoom);
      userRoomsList[index].numNewMsgs = 0;
      $('#' + roomNameClass + '-badge').hide();
      $('#' + roomNameClass + '-badge').parent().removeClass("tab-badge-notification-bg");
      $('#public-rooms-container').hide();
      $('div.num-connected').hide();
      $('div#num-connected-' + roomNameClass).show();
      $('div#all-users-list-container').show();
    });
    $('ul#tab li:contains(' + data.roomName + ') span.glyphicon-remove').click(function() {
      $(this).parent().parent().remove();
      $('div#room-' + roomNameClass).remove();
      $('div#userlist-' + roomNameClass).remove();
      socket.emit('leaveRoom', data.roomName);
      $('ul#tab a:contains("Lobby")').click();
      currentRoom = "Lobby";
      var index = userRoomsList.map(function(e) {
        return e.roomName;
      }).indexOf(data.roomName);
      userRoomsList.splice(index, 1);
    });
    $('ul#tab li:contains(' + data.roomName + ') a').click();
  } else {
    if (data.errorCode == 1) {
      window.alert("Illegal room name! Room name can only contain alphanumeric characters, spaces, and underscores!");
    } else if (data.errorCode == 2) {
      window.alert("A room with that name already exists! Please choose another name!");
    } else if (data.errorCode == 3) {
      window.alert("Room name 'Lobby' is reserved, please choose another name!");
    } else {
      window.alert("Unknown error! Room cannot be created!");
    }
  }
});
socket.on('populatePublicRooms', function(data) {
  populatePublicRoomsList(data);
});
socket.on("failedInvitation", function(data) {
  $('#failed-invitation-modal>div>div>div.modal-body').text("Cannot invite user: " + data.invitee + ", they seem to already be in room: " + data.roomName);
  $('#failed-invitation-modal').modal('show');
});
socket.on("deleteTabs", function() {
  userRoomsList = [{
    'roomName': "Lobby",
    numNewMsgs: 0
  }];
  $('ul#tab a:contains("Lobby")').click();
  currentRoom = "Lobby";
  $("ul#tab>li+li+li").remove();
  $("div#chat-panel>div+div+div+div").remove();
});
$(function() {
  currentRoom = "Lobby";
  $('#message-input').keypress(function(event) {
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if (keycode == '13') {
      $("#submit").click();
    }
  });
  $('ul#tab a:contains("Lobby")').click(function(e) {
    e.preventDefault();
    $(this).tab('show');
    $('div.usersList').hide();
    $('div#usersList-Lobby').show();
    currentRoom = "Lobby";
    var index = userRoomsList.map(function(e) {
      return e.roomName;
    }).indexOf(currentRoom);
    userRoomsList[index].numNewMsgs = 0;
    $('#' + currentRoom + '-badge').hide();
    $('#' + currentRoom + '-badge').parent().removeClass("tab-badge-notification-bg");
    $('#public-rooms-container').show();
    $('div.num-connected').hide();
    $('div#num-connected-Lobby').show();
    $('div#all-users-list-container').hide();
  });
  $('ul#tab a:contains("Lobby")').tab('show');
  $('ul#tab li span.glyphicon-remove').click(function() {
    $(this).parent().parent().remove();
    var roomName = $(this).parent().text();
    $('div#room-' + toClassString(roomName)).remove();
    socket.emit('leaveRoom', roomName);
  });
  $('#add-room').click(function() {
    $('#create-room-modal').modal('show');
  });
  $('#create-room-button').click(function() {
    var isPublic = $('input#public-room-checkbox').prop("checked") ? true : false;
    if (roomName) {
      socket.emit('createRoom', {
        "roomName": roomName,
        "isPublic": isPublic
      });
      $('input#create-room-modal-input').val('');
      $('input#public-room-checkbox').prop("checked", false);
      $('#room-modal-close-button').click();
      var usersToInvite = new Array();
      $.each($("#create-room-modal-invite-user-container>div"), function() {
        if ($(this).data("selected") == "true") {
          usersToInvite.push($(this).data("username"));
          $(this).removeClass("create-room-modal-username-selected");
          $(this).data("selected", "false");
        }
      });
      for (var i = 0; i < usersToInvite.length; i++) {
        socket.emit('inviteUser', {
          'username': usersToInvite[i],
          'roomName': roomName
        });
      }
    }
  });
  $("#create-room-modal-input").keypress(function(event) {
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if (keycode == '13') {
      $("#create-room-button").click();
    }
  });
  $('#invitation-modal-accept-button').click(function() {
    var roomName = $('#invitation-modal-accept-button').data("roomName");
    socket.emit('joinRoom', {
      "roomName": roomName,
      "hasAccepted": true
    });
    $('#invitation-modal').modal('hide');
  });
  $('#invitation-modal-decline-button').click(function() {
    var roomName = $('#invitation-modal-accept-button').data("roomName");
    socket.emit('joinRoom', {
      "roomName": roomName,
      "hasAccepted": false
    });
  });
  $('#submit').click(function() {
    sentMessage();
  });
  emojify.setConfig({
    emojify_tag_type: "span.msg-content",
    img_dir: "/img/emoji/"
  });
});