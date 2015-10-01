'use strict';
document.addEventListener('DOMContentLoaded', function() {

  window.channel = _.extend({}, Backbone.Events);

  //window.machine = new Machine();

  window.machine = new Machine();

  window.navView = new NavView({el: '.header'});
  window.consoleView = new ConsoleView({el: '.console-page'});
  window.jogView = new JogView({el: '.jogview'});
  window.controlView = new ControlView({el: '.control-panel'});
  window.programView = new ProgramView({el: '.program-view'})
  window.statusBarView = new StatusBarView({el: '.machine-status'})

  var stream = new Stream();

  machine.autoconnect();

  $('.connect-button').on('click', function() {
    $('div.connecting-msg').removeClass('hidden');
    $('div.connection-error').addClass('hidden');
    $('div.content').addClass('hidden');
    machine.autoconnect();
  })

  channel.bind('machine.response', function(msg) {

  })

  channel.bind('alert', function(e)
  {
      if (e[0] == 'error')
          e[1] = '<i class="fa fa-exclamation-circle"></i> '+e[1];
      else if (e[0] == 'info')
          e[1] = '<i class="fa fa-info-circle"></i> '+e[1];

      $.bootstrapGrowl(e[1], {
          ele: 'body',
          type: e[0],
          offset: {from: 'top', amount: 10},
          align: 'right',
          width: 248,
          delay: 5000,
          allow_dismiss: true,
          stackup_spacing: 5
      });
  });

  channel.bind('connection.success', function(e) {
      chrome.app.window.current().innerBounds.setSize(380,417);
      $('.connecting-msg').addClass('hidden');
      $('.content').removeClass('hidden');
  })

  channel.bind('connection.error', function(e) {
      chrome.app.window.current().innerBounds.setSize(380,187)
      $('.connecting-msg').addClass('hidden');
      $('.connection-error').removeClass('hidden');
  })

  channel.bind('screen.autoresize', function(e) {
    chrome.app.window.current().innerBounds.setSize($('.content').width(),$('.content').height()+48);
  });

}, false);
