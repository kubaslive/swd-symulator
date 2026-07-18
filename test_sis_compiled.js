'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDomServer = require('react-dom/server');

var _srcSisEditor = require('./src/SisEditor');

var _srcSisEditor2 = _interopRequireDefault(_srcSisEditor);

try {
  var html = (0, _reactDomServer.renderToString)(_react2['default'].createElement(_srcSisEditor2['default'], {
    db: {},
    userProfile: { tenantId: 'Test' },
    onClose: function () {},
    tenantJrgUnits: ['JRG 1'],
    tenantOspUnits: ['OSP Test'],
    tenantVehicles: {},
    tenantUnitCoordinates: {}
  }));
  console.log("Rendered successfully:", html.substring(0, 100));
} catch (e) {
  console.error("Crash during render:", e);
}
