var express = require('express');
//express도 모듈임. 모듈을 로드해왔다. 
var app = express();
//express 함수를 호출함 return 된 값을 app 이라는 변수에 담겼다
const bodyParser = require('body-parser')

var fs = require('fs');
var path = require('path');
var qs = require('querystring');
var sanitizeHtml = require('sanitize-html');
var template= require('./lib/template.js');
const { URLSearchParams } = require('url');

//body는 웹브라우저쪽에서 요청한 본체이고 그 본체를 설명하는 것이 헤더
//본체인 데이터를 parser 분석해서 필요한 형태로 가공

//json으로 요청할 때 이렇게 씀
app.use(bodyParser.json())

//폼데이터를 요청할 때 이렇게 씀
app.use(bodyParser.urlencoded({ extended: true }))
//main.js가 실행 될 때마다 즉 사용자가 요청할 때마다 이 코드에 의해서 만들어진 미들웨어가 실행됨
//미들웨어는 내부적으로 사용자가 전송한 포스트 데이터를 내부적으로 분석해서 모든 데이터를 가져온 후에 
//엔드포인트에 해당하는 콜백을 호출하도록 되어 있음
//콜백의 처음 인자인 request에는 body라는 property가 없는데 만들어줌 누가? body parser가

//app.get(path, callback) -> route, routing
//app.get('/', (req, res)=> res.send('Hello World!'))

app.post('/update_process', function(request, response){
    var post = request.body;
    var id = post.id;
    var title = post.title;
    var description = post.description;
    fs.rename(`data/${id}`, `data/${title}`, function(error){
      fs.writeFile(`data/${title}`, description, 'utf8', function(err){
        response.redirect(`/?id=${title}`);
      });
    });
  });
  
  app.post('/delete_process', function(request, response){
    var post = request.body;
    var id = post.id;
    var filteredId = path.parse(id).base;
    fs.unlink(`data/${filteredId}`, function(error){
      response.redirect('/');
    });
  });

//   const { body: { id, title, description } } = request;
//   fs.rename(`data/${id}`, `data/${title}`, function(error){
//     if (error) {
//       throw error;
//     }
//     fs.writeFile(`data/${title}`, description, 'utf8', function(err){
//       if (err) {
//         throw err;
//       }
//       response.writeHead(302, {Location: `/?id=${title}`});
//       response.end();
//     });
//   });
// });

app.get('/', function(request, response){
  var params = new URL(request.url, `http://${request.headers.host}`).searchParams;
  console.log(params);
  fs.readdir('./data', function(error, filelist){
    var title = 'Welcome' + params.get('id');
    var description = 'Hello, Node.js';
    var list = template.list(filelist);
    var html = template.HTML(title, list,
      `<h2>${title}</h2>${description}`,
      `<a href="/create">create</a>`
    );
    response.send(html);
  });
});

//path 방식을 통해서 파라미터가 전달 되는 경우에 처리되는 방법
//url path 방식으로 파라미터를 전달하는 것을 처리하는 라우팅 기법
app.get('/page/:pageId', function(request, response){
  fs.readdir('./data', function(error, filelist){
    var filteredId = path.parse(request.params.pageId).base;
    fs.readFile(`data/${filteredId}`, 'utf8', function(err, description){
      var title = request.params.pageId;
      var sanitizedTitle = sanitizeHtml(title);
      var sanitizedDescription = sanitizeHtml(description, {
        allowedTags:['h1']
      });
      var list = template.list(filelist);
      var html = template.HTML(sanitizedTitle, list,
        `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
        ` <a href="/create">create</a>
          <a href="/update/${sanitizedTitle}">update</a>
          <form action="delete_process" method="post">
            <input type="hidden" name="id" value="${sanitizedTitle}">
            <input type="submit" value="delete">
          </form>`
      );
      response.send(html);
    });
  });
});

app.get('/create', function(request, response){
  fs.readdir('./data', function(error, filelist){
    var title = 'WEB - create';
    var list = template.list(filelist);
    var html = template.HTML(title, list, `
      <form action="/create_process" method="post">
        <p><input type="text" name="title" placeholder="title"></p>
        <p>
          <textarea name="description" placeholder="description"></textarea>
        </p>
        <p>
          <input type="submit">
        </p>
      </form>
    `, '');
    response.send(html);
  });
})

app.post('/create_process', function(request, response){ 
  const { body: { title, description } } = request;
  fs.writeFile(`./data/${title}`, description, 'utf8', function(err){
    response.writeHead(302, {Location: `/?id=${title}`});
    response.end();
  });
}); 

//body parser라는 미들 웨어로 내부적으로 '/create_process' 라우터를 사용할 때 request 객체에 body property에 접근가능
app.post('/create_process', function(request, response){
  var post = request.body;     
  var title = post.title;
  var description = post.description;
  fs.writeFile(`./data/${title}`, description, 'utf8', function(err){
    response.writeHead(302, {Location: `/?id=${title}`});
    response.end();
  })
}); 

app.get('/update/:pageId', function(request, response){
  fs.readdir('./data', function(error, filelist){
    var filteredId = path.parse(request.params.pageId).base;
    fs.readFile(`data/${filteredId}`, 'utf8', function(err, description){
      var title = request.params.pageId;
      var list = template.list(filelist);
      var html = template.HTML(title, list,
        `
        <form action="/update_process" method="post">
          <input type="hidden" name="id" value="${title}">
          <p><input type="text" name="title" placeholder="title" value="${title}"></p>
          <p>
            <textarea name="description" placeholder="description">${description}</textarea>
          </p>
          <p>
            <input type="submit">
          </p>
        </form>
        `,
        `<a href="/create">create</a> <a href="/update?id=${title}">update</a>`
      );
      response.send(html);
    });
  });
});



app.listen(3000, () => console.log('Example app listening on port 3000!'))
//app 객체의 listen 메소드에 첫번째 인자로 3000을 주면 listen이라는 메소드가 실행될 때 웹서버가 실행되면서
//3000번 포트에 리스닝 하게 되고 그 다음 코드가 실행 됨
//요청에 대해서 응답할 수 있도록 httpServer를 구동시키는 API == server.listen()



/*
var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var template = require('./lib/template.js');
var path = require('path');
var sanitizeHtml = require('sanitize-html');

var app = http.createServer(function(request,response){
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname = url.parse(_url, true).pathname;
    if(pathname === '/'){
      if(queryData.id === undefined){
      } else {
        fs.readdir('./data', function(error, filelist){
          var filteredId = path.parse(queryData.id).base;
          fs.readFile(`data/${filteredId}`, 'utf8', function(err, description){
            var title = queryData.id;
            var sanitizedTitle = sanitizeHtml(title);
            var sanitizedDescription = sanitizeHtml(description, {
              allowedTags:['h1']
            });
            var list = template.list(filelist);
            var html = template.HTML(sanitizedTitle, list,
              `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
              ` <a href="/create">create</a>
                <a href="/update?id=${sanitizedTitle}">update</a>
                <form action="delete_process" method="post">
                  <input type="hidden" name="id" value="${sanitizedTitle}">
                  <input type="submit" value="delete">
                </form>`
            );
            response.writeHead(200);
            response.end(html);
          });
        });
      }
    }  else if(pathname === '/create_process'){
      var body = '';
      request.on('data', function(data){
          body = body + data;
      });
      request.on('end', function(){
          var post = qs.parse(body);
          var title = post.title;
          var description = post.description;
          fs.writeFile(`data/${title}`, description, 'utf8', function(err){
            response.writeHead(302, {Location: `/?id=${title}`});
            response.end();
          })
      });
    } else if(pathname === '/update'){
      fs.readdir('./data', function(error, filelist){
        var filteredId = path.parse(queryData.id).base;
        fs.readFile(`data/${filteredId}`, 'utf8', function(err, description){
          var title = queryData.id;
          var list = template.list(filelist);
          var html = template.HTML(title, list,
            `
            <form action="/update_process" method="post">
              <input type="hidden" name="id" value="${title}">
              <p><input type="text" name="title" placeholder="title" value="${title}"></p>
              <p>
                <textarea name="description" placeholder="description">${description}</textarea>
              </p>
              <p>
                <input type="submit">
              </p>
            </form>
            `,
            `<a href="/create">create</a> <a href="/update?id=${title}">update</a>`
          );
          response.writeHead(200);
          response.end(html);
        });
      });
    } else if(pathname === '/update_process'){
      var body = '';
      request.on('data', function(data){
          body = body + data;
      });
      request.on('end', function(){
          var post = qs.parse(body);
          var id = post.id;
          var title = post.title;
          var description = post.description;
          fs.rename(`data/${id}`, `data/${title}`, function(error){
            fs.writeFile(`data/${title}`, description, 'utf8', function(err){
              response.writeHead(302, {Location: `/?id=${title}`});
              response.end();
            })
          });
      });
    } else if(pathname === '/delete_process'){
      var body = '';
      request.on('data', function(data){
          body = body + data;
      });
      request.on('end', function(){
          var post = qs.parse(body);
          var id = post.id;
          var filteredId = path.parse(id).base;
          fs.unlink(`data/${filteredId}`, function(error){
            response.writeHead(302, {Location: `/`});
            response.end();
          })
      });
    } else {
      response.writeHead(404);
      response.end('Not found');
    }
});
app.listen(3000);

*/