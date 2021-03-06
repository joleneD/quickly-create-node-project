import express from 'express';
import {join} from 'path';
import favicon from 'serve-favicon';
// import logger from 'morgan';
import cookieParser  from 'cookie-parser';
import bodyParser from 'body-parser';
import nunjucks from 'nunjucks';
import glob from 'glob';
import proxy from 'http-proxy-middleware';
import log4js from 'log4js';
import  session from 'express-session'

import index from './routes/index';
import users from './routes/users';
import config from './config';
import  logger from './logger';



const app = express();


//配置日志
app.use(log4js.connectLogger(logger, {level:'auto', format: ':method :url'}));

// 配置 NunJucks 模板引擎
nunjucks.configure(config.viewPath, {
  autoescape: true,
  express: app,
  watch: true,
  noCache: false
})

//配置网站favicon.ico图标,所在目录/public/images/favicon.ico
try{
  app.use(favicon(join(__dirname, './../public/images', 'favicon.ico')));
  logger.debug("加载图标成功");
}catch(err){
  logger.error("网站图片配置失败，错误信息: "+err.message);
}


/*
 配置post请求体解析器
 客户端提交方式：一种是查询字符串普通get，一种是enctype="application/json"格式提交
 将解析到的post请求体作为一个对象挂在给req.body
 就可以通过req.body.表单属性名 获取值
 */
app.use(bodyParser.json());//以JSON格式提s交表单是HTML5中一种很新的规范
app.use(bodyParser.urlencoded({extended: false}));

//配置cookie解析器
app.use(cookieParser());

//配置session
app.use(session({
  secret: config.sessionSecret,
  cookie: {maxAge: 80000 },  //设置maxAge是80000ms，即80s后session和相应的cookie失效过期
  resave: false,
  saveUninitialized: true,
}));


//配置代理
if (config.proxyTarget && config.proxyPrefix && config.proxyTarget != "") {
  app.use(config.proxyPrefix, proxy({target: config.proxyTarget, changeOrigin: true}));
  logger.info("代理配置成功，服务器: " + config.proxyTarget + config.proxyPrefix);
}


//配置静态资源目录
app.use('/public', express.static(config.publicPath));
app.use('/node_modules', express.static(config.node_modulesPath));
app.use('/static', express.static(config.staticPath));


//手动载入路由
// app.use('/', index);
// app.use('/api/users', users);


//自动载入路由，glob是异步的，错误处理应该在路由加载完毕后加载
new Promise((resolve, reject) => {
  glob(config.routePath, (err, files) => {
    if (err) {
      logger.error('自动载入路由失败'+err.message);
    }
    files.forEach((filePath) => {
      const router = require(filePath).default;

      if (typeof router === 'function') {
        app.use(router.prefix, router);
        logger.info('路由添加成功,路由前缀:' + router.prefix);
      }
    });
    resolve();
  })
}).then(function () {
  logger('app.js').info('自动载入路由成功');
  //配置404页面
  app.use((req, res, next) => {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

//配置错误处理中间件，以前错误直接throw err, 现在修改为next(err)即可
  app.use((err, req, res, next) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error.html');
  });
})



module.exports = app;
