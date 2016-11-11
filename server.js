
var fs = require("fs")
var http = require("http")
var url = require("url")
var path = require("path")
var pug = require("pug")
var ffmpeg = require('fluent-ffmpeg')

var express = require('express')
var app = express()

var videos = []

var ADDRESS = '192.168.1.100'
var PORT = 8888

fs.readdir("./videos", function(err, files) {
	if(err){
		console.log('error:\n' + err)
		return;
	}
	files.forEach(function(file) {
		if (file.indexOf('.mp4')) {
			fs.stat("./videos" + '/' + file, function(err, stat){
				if (err) {
					console.log(err)
					return
				}
				console.log('文件名:' + "./videos" + '/' + file)
				videos[videos.length] = file	
			})
			ffmpeg('./videos/' + file).screenshot({
				timestamps: ['1%'],
				filename: file + '.jpeg',
				folder: './thumbnail',
				size: '15%'
			})
		}
	})
})


app.all('/', function(erq, res) {
	var html = pug.renderFile("./index.pug", {
		videos: videos,
		urlString: ADDRESS + ':' + PORT
	})
	res.writeHead(200, { "Content-Type": "text/html" })
	res.end(html)
})

app.all('/*.html', function(req, res) {
	var html = pug.renderFile("./video.pug", {
		url: req.url.substring(1, req.url.length - 5),
		urlString: ADDRESS + ':' + PORT
	})
	res.writeHead(200, { "Content-Type": "text/html" })
	res.end(html)
})

app.all('/*jpeg', function(req, res) {
	var image = fs.readFileSync('./thumbnail/' + req.url)
	res.writeHead(200, { "Content-Type": "image/jpeg" })
	res.end(image)
})

app.all('/*.mp4', function(req, res) {
	var file = path.resolve(__dirname, "videos" + req.url)
	fs.stat(file, function(err, stats) {
	if (err) {
		if (err.code === 'ENOENT') {
			// 404 Error if file not found
			return res.statusCode = 404;
		}
		res.end(err);
	}
	var range = req.headers.range;
	if (!range) {
		// 416 Wrong range
		return res.statusCode = 416;
	}
	var positions = range.replace(/bytes=/, "").split("-");
	var start = parseInt(positions[0], 10);
	var total = stats.size;
	var end = positions[1] ? parseInt(positions[1], 10) : total - 1;
	var chunksize = (end - start) + 1;

	res.writeHead(206, {
		"Content-Range": "bytes " + start + "-" + end + "/" + total,
		"Accept-Ranges": "bytes",
		"Content-Length": chunksize,
		"Content-Type": "video/mp4"
	});

	var stream = fs.createReadStream(file, { start: start, end: end })
		.on("open", function() {
			stream.pipe(res);
		}).on("error", function(err) {
			res.end(err);
		});
	});
})

app.listen(PORT, function() {
	console.log('App listening at http://%s:%s', ADDRESS, PORT);
})