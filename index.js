const express = require("express");
const app = express();
const http = require("http").Server(app);
const body_parser = require("body-parser");
const morgan = require('morgan');
const path = require("path");
const io = require("socket.io")(http);
const ss = require("socket.io-stream");
var stream = ss.createStream();
const socketIOfile = require("socket.io-file");
const session = require("express-session");
const dl = require("delivery");
const fs = require("fs");

app.use(body_parser.urlencoded({extended: false}));
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "./static")));

const rooms = ["room1", "room2"];  // temporary here ;)

app.get("/", (req, res) => {
    res.render("index.ejs",{error: ""}); 
});

app.post("/", (req, res) => {
    if (rooms.includes(req.body.code)) {
        session.code = req.body.code;
        res.render("chat.ejs", {room: req.body.code});
    }
    else {
        res.render("index.ejs", {error: "room code does not exists"});
    }
});

app.get("/chat", (req, res) => {
    if (session.code != null) {
        res.redirect("/chat");
    }
    else {
        res.redirect("/");
    }
});

app.post("/chat", (req, res) => {
    console.log("->"+req.body.file);
    // res.redirect("/chat");
});

app.get("/error", (req, res) => {
    res.render("error.ejs");
});

io.sockets.on("connection", function(socket) {
    var delivery = dl.listen(socket);
    
    delivery.on("receive.success", function(file) {
        var params = file.params;

        fs.writeFile("./tmp/"+file.name, file.buffer, function(err) {
            if(err) {
                console.log("Error while saving file");
            }
            else{
                console.log("File saved");
                
                var file_ext = file.name.split(".")[1];
                var msg = "<strong>"+socket.username+" </strong>(<i>attachment</i>): "+file.name+"  "+
                "<label for='att"+file.name+"'><i class='petalicon petalicon-download'"+
                "style='cursor: pointer;'></i></label>"+
                "<button id='att"+file.name+"'"+
                "onclick='download_attach(\""+file.name+"\", "+"\"attach."+file_ext+"\")'"+
                "style='opacity: 0;position: absolute;z-index: -1;'>donwload</button>";
                
                io.sockets.in(socket.room).emit("chat_message", msg);
            };
        });
    });

    ss(socket).on("filedownload", function (stream, name, callback) {
        callback({
            name : "filename",
            size : 500
        });
        
        var MyFileStream = fs.createReadStream("./tmp/"+name);
        MyFileStream.pipe(stream);
    });
    
    socket.on("room", function(room) {
        socket.room = room;
        socket.join(room);
    });
    
    socket.on("code", function(code) {
        socket.code = code;
        io.emit("is_online", socket.code);
    });

    socket.on("disconnect", function(username) {
        socket.leave(socket.room);
        io.sockets.in(socket.room).emit("is_offline", socket.username);
    });
    socket.on("is_online", function(username) {
        socket.username = username;
        io.sockets.in(socket.room).emit("is_online", socket.username);
    });

    socket.on("chat_message", function(message) {
        io.in(socket.room).emit("chat_message", "<strong>" + socket.username + "</strong>: " + message);
    });
});


const server = http.listen(8080, function() {
    console.log("listening on port 8080");
});
