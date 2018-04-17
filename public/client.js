var socket = io();
var positions = [];

socket.on('physics step', function(obj){
	positions = new Float32Array(obj);
});

var canvas,ctx;
window.addEventListener("DOMContentLoaded",function(){
	canvas = document.getElementById("map");
	canvas.height = canvas.clientHeight;
	canvas.width = canvas.clientWidth;
	ctx = canvas.getContext("2d");
	ctx.translate(canvas.width/2,canvas.height/2);
	ctx.scale(8,8);
	draw();
},false);

function draw(){

	ctx.clearRect(-canvas.width,-canvas.height,canvas.width*2,canvas.height*2);	
	ctx.fillStyle = "#dddddd";
	ctx.fillRect(-25,-25,50,50);
	for (i = 0; i < positions.length; i+=3){
		ctx.fillStyle = "rgb("+Math.max(Math.abs(255+Math.max(positions[i+2],-255)),0)+",0,0)";
		ctx.fillRect(positions[i],positions[i+1],.3,.3);
	}	
	
	requestAnimFrame(function() {
		draw();
	});
}

window.requestAnimFrame = (function(callback) {
	return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
	function(callback) {
		window.setTimeout(callback, 1000 / 60);
	};
})();