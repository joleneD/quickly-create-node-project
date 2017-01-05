'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _path = require('path');

var _serveFavicon = require('serve-favicon');

var _serveFavicon2 = _interopRequireDefault(_serveFavicon);

var _morgan = require('morgan');

var _morgan2 = _interopRequireDefault(_morgan);

var _cookieParser = require('cookie-parser');

var _cookieParser2 = _interopRequireDefault(_cookieParser);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _nunjucks = require('nunjucks');

var _nunjucks2 = _interopRequireDefault(_nunjucks);

var _glob = require('glob');

var _glob2 = _interopRequireDefault(_glob);

var _httpProxyMiddleware = require('http-proxy-middleware');

var _httpProxyMiddleware2 = _interopRequireDefault(_httpProxyMiddleware);

var _index = require('./routes/index');

var _index2 = _interopRequireDefault(_index);

var _users = require('./routes/users');

var _users2 = _interopRequireDefault(_users);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = (0, _express2.default)();

// 配置 NunJucks 模板引擎
_nunjucks2.default.configure(_config2.default.viewPath, {
  autoescape: true,
  express: app,
  watch: true,
  noCache: false
});

//配置网站favicon.ico图标,所在目录/public/images/favicon.ico
//app.use(favicon(join(__dirname, 'public', 'images', 'favicon.ico')));

//配置日志
app.use((0, _morgan2.default)('dev'));

/*
 配置post请求体解析器
 客户端提交方式：一种是查询字符串普通get，一种是enctype="application/json"格式提交
 将解析到的post请求体作为一个对象挂在给req.body
 就可以通过req.body.表单属性名 获取值
 */
app.use(_bodyParser2.default.json()); //以JSON格式提s交表单是HTML5中一种很新的规范
app.use(_bodyParser2.default.urlencoded({ extended: false }));

//配置cookie解析器
app.use((0, _cookieParser2.default)());

//配置代理
if (_config2.default.proxyTarget && _config2.default.proxyPrefix && _config2.default.proxyTarget != "") {
  app.use(_config2.default.proxyPrefix, (0, _httpProxyMiddleware2.default)({ target: _config2.default.proxyTarget, changeOrigin: true }));
  console.log("代理配置成功，服务器: " + _config2.default.proxyTarget + _config2.default.proxyPrefix);
}

//配置静态资源目录
app.use('/public', _express2.default.static(_config2.default.publicPath));
app.use('/node_modules', _express2.default.static(_config2.default.node_modulesPath));
app.use('/static', _express2.default.static(_config2.default.staticPath));

//手动载入路由
// app.use('/', index);
//app.use('/api/users', users);


//自动载入路由
function loadRoutes() {
  return new Promise(function (resolve, reject) {
    (0, _glob2.default)(_config2.default.routePath, function (err, files) {
      if (err) {
        reject(err);
      }
      files.forEach(function (filePath) {
        var router = require(filePath).default;

        if (typeof router === 'function') {
          app.use(router.prefix, router);
          console.log('路由添加成功,路由信息:' + router.prefix);
        }
      });

      resolve();
    });
  });
}

loadRoutes().then(function () {

  //配置404页面
  app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  //配置错误处理中间件，以前错误直接throw err, 现在修改为next(err)即可
  app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error.html');
  });
});

module.exports = app;