document.getElementById("attach").onchange = function() {
	document.getElementById("submit_attach").click();
};

$("#send_attach").click(function(e) {
	e.preventDefault();  // prevents page reloading
	socket.emit("download_attach", $("#txt").val());
	$("#txt").val("");
	return false;
});

// clicked on "donwload" button
function download_attach(name, originalFilename) {
	var stream = ss.createStream(),
	fileBuffer = [],
	fileLength = 0;

	// request to server
	ss(socket).emit("filedownload", stream, name, function (fileError, fileInfo) {
		console.log(["File Found!", fileInfo]);

		// response with data
		stream.on("data", function (chunk) {
			fileLength += chunk.length;
			fileBuffer.push(chunk);
		});

		stream.on("end", function () {
			var filedata = new Uint8Array(fileLength),
			i = 0;

			// storing file data into array
			fileBuffer.forEach(function (buff) {
				for (var j = 0; j < buff.length; j++) {
					filedata[i] = buff[j];
					i++;
				}
			});

			download_file([filedata], originalFilename);
		});
	});
}

// browser serves the file
function download_file(data, fileName) {
	var a = document.createElement("a");
	document.body.appendChild(a);
	a.style = "display: none";
	
	var blob = new Blob(data);
	var url = window.URL.createObjectURL(blob);
	
	a.href = url;
	a.download = fileName;
	a.click();
	window.URL.revokeObjectURL(url);
}

$("#chat_input").submit(function(e) {
	e.preventDefault();
	var msg = $("#txt").val();
	if (msg != "") {
		socket.emit("chat_message", msg);
		$("#txt").val("");
	}
	// return false;
});


// socket stuff
var socket = io.connect("http://localhost:8080");
socket.on("connect", function() {
	socket.emit("room", "<%= room %>");

	var delivery = new Delivery(socket);

	delivery.on("delivery.connect", function(delivery) {
		$("input[type=submit]").click(function(evt) {
			var file = $("input[id=attach]")[0].files[0];

			var extraParams = {foo: "bar"};
			delivery.send(file, extraParams);
			evt.preventDefault();

			var curr_user = $("p[id=sub]").text().split(":")[1];
			// $("#messages").append($("<li>").html(msg));
		});
	});

	delivery.on("send.success", function(fileUID) {
		console.log("file was successfully sent.");
	});

	delivery.on("receive.start", function(fileUID) {
		 console.log('receiving a file!');
	});

	delivery.on("receive.success", function(file) {
		var params = file.params;
		console.log(file.name);
	});
});


socket.on("chat_message", function(msg) {
	$("#messages").append($("<li>").html(msg));
});

socket.on("is_online", function(username) {
	// $("#sub").append("username: "+username);
	$("#messages").append($("<li>").html("<strong>"+username+"</strong><i> joined the chat...</i>"));
});

socket.on("is_offline", function(username) {console.log(username);
	$("#messages").append($("<li>").html("<strong>"+username+"</strong><i> has left the chat...</i>"));
});

socket.on("error", function(code) {
	prompt("Code "+code+" not valid.");
});

// getting chat username
do {
	var username = prompt("Enter your username");
} while(username == null);

socket.emit("is_online", username);
