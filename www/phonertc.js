var exec = require('cordova/exec');
var videoViewConfig;

function Session(config) { 
  // make sure that the config object is valid
  if (typeof config !== 'object') {
    throw {
      name: 'PhoneRTC Error',
      message: 'The first argument must be an object.'
    };
  }

  if (typeof config.isInitiator === 'undefined' ||
      typeof config.turn === 'undefined' ||
      typeof config.streams === 'undefined') {
    throw {
      name: 'PhoneRTC Error',
      message: 'isInitiator, turn and streams are required parameters.'
    };
  }

  var self = this;
  self.events = {};
  self.config = config;
  self.__pendingActions = [];

  // make all config properties accessible from this object
  Object.keys(config).forEach(function (prop) {
    Object.defineProperty(self, prop, {
      get: function () { return self.config[prop]; },
      set: function (value) { self.config[prop] = value; }
    });
  });

  function callEvent(eventName) {
    if (!self.events[eventName]) {
      return;
    }

    var args = Array.prototype.slice.call(arguments, 1);
    self.events[eventName].forEach(function (callback) {
      callback.apply(self, args);
    });
  }

  function onSendMessage(data) {
    if (data.type === '__set_session_key') {
      self.__sessionKey = data.sessionKey;

      // execute pending actions
      self.__pendingActions.forEach(function (action) {
        action.call(self);
      });
    } else if (data.type === '__answered') {
      callEvent('answer');
    } else if (data.type === '__disconnected') {
      callEvent('disconnect');
    } else {
      callEvent('sendMessage', data);
    }
  }

  exec(onSendMessage, null, 'PhoneRTCPlugin', 'createSessionObject', [config]);
};

Session.prototype.on = function (eventName, fn) {
  // make sure that the second argument is a function
  if (typeof fn !== 'function') {
    throw {
      name: 'PhoneRTC Error',
      message: 'The second argument must be a function.'
    };
  }

  // create the event if it doesn't exist
  if (!this.events[eventName]) {
    this.events[eventName] = [];
  } else {
    // make sure that this callback doesn't exist already
    for (var i = 0, len = this.events[eventName].length; i < len; i++) {
      if (this.events[eventName][i] === fn) {
        throw {
          name: 'PhoneRTC Error',
          message: 'This callback function was already added.'
        };
      }
    }
  }

  // add the event
  this.events[eventName].push(fn);
};

Session.prototype.off = function (eventName, fn) {
  // make sure that the second argument is a function
  if (typeof fn !== 'function') {
    throw {
      name: 'PhoneRTC Error',
      message: 'The second argument must be a function.'
    };
  }

  if (!this.events[eventName]) {
    return;
  }

  var indexesToRemove = [];
  for (var i = 0, len = this.events[eventName].length; i < len; i++) {
    if (this.events[eventName][i] === fn) {
      indexesToRemove.push(i);
    }
  }

  indexesToRemove.forEach(function (index) {
    this.events.splice(index, 1);
  })
};

Session.prototype.call = function (data) {
  exec(null, null, 'PhoneRTCPlugin', 'call', [{ 
    sessionKey: this.__sessionKey
    message: JSON.stringify(data)
  }]);
};

Session.prototype.receiveMessage = function (data) {
  exec(null, null, 'PhoneRTCPlugin', 'receiveMessage', [{
    sessionKey: this.__sessionKey,
    message: JSON.stringify(data)
  }]);
};

Session.prototype.renegotiate = function () {
  exec(null, null, 'PhoneRTCPlugin', 'renegotiate', [{
    config: this.config,
    sessionKey: this.__sessionKey
  }]);
};

Session.prototype.close = function () {
  exec(null, null, 'PhoneRTCPlugin', 'disconnect', [{ 
    sessionKey: this.__sessionKey 
  }]);
};

exports.Session = Session;

function getLayoutParams(videoElement) {
  var boundingRect = videoElement.getBoundingClientRect();

  if (cordova.platformId === 'android') {
    return {
      position: [boundingRect.left + window.scrollX, boundingRect.top + window.scrollY],
      size: [videoElement.offsetWidth, videoElement.offsetHeight]
    };
  }

  return {
    position: [boundingRect.left, boundingRect.top],
    size: [videoElement.offsetWidth, videoElement.offsetHeight]
  };
}

function setVideoView(config) {
  videoViewConfig = config;

  var container = config.container;

  if (container) {
    config.containerParams = getLayoutParams(container);
    delete config.container;
  }

  config.devicePixelRatio = window.devicePixelRatio || 2;

  exec(null, null, 'PhoneRTCPlugin', 'setVideoView', [config]);

  if (container) {
    config.container = container;
  }
};

document.addEventListener('touchmove', function () {
  if (videoViewConfig) {
    setVideoView(videoViewConfig);
  }
});

exports.setVideoView = setVideoView;

exports.hideVideoView = function () {
  exec(null, null, 'PhoneRTCPlugin', 'hideVideoView', []);
};

exports.showVideoView = function () {
  exec(null, null, 'PhoneRTCPlugin', 'showVideoView', []);
};