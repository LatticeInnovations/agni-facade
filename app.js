const express = require('express')
const app = express();
const logger = require('morgan')
const bodyParser =  require('body-parser')
const expressSwagger = require('express-swagger-generator')(app)
const cors = require('cors')

let options = {
    swaggerDefinition: {
        info: {
            description: 'This is a sample server',
            title: 'FHIR DEMO',
            version: '1.0.0',
        },
        host: process.env.swaggerHost ,
        basePath: '/api',
        produces: [
            "application/json",
            "application/xml"
        ],
        schemes: ['http','https'],
        securityDefinitions: {
            JWT: {
                type: 'apiKey',
                in: 'header',
                name: 'x-access-token',
                description: "",
            }
        }
    },
    basedir: __dirname, //app absolute path
    files: ['./router/**/*.js'] //Path to the API handle folder
};
expressSwagger(options);

app.use('/upload', express.static('uploads'));

logger.token('id', function getId(req) {
  return req.id
});

logger.token('req', function(req) {
  return JSON.stringify(req.body);
});

let loggerFormat = 'Logger --  :id [:date[web]] ":method :url" :status :response-time :req ';

app.enable("trust proxy"); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
 
app.use(cors());


app.use(bodyParser.urlencoded({
  extended: false}))
app.use(bodyParser.json());

app.use(logger(loggerFormat, {
  skip: function (req, res) {
      return res.statusCode < 400
  },
  stream: process.stdout
}));

app.use(logger(loggerFormat, {
  skip: function (req, res) {
      return res.statusCode >= 400
  },
  stream: process.stderr
}));

require('./router')(app);

app.use((req, res, next) => {
  console.log("check 404")
  const error = new Error('Not found');
  error.status = 404;
  next(error)
})

app.use((error, req, res, next) => {
  console.log("check 500", error)
  res.status(error.status || 500)
  res.json({
    error: {
      message: error.message
    }
  })
})

module.exports = app;