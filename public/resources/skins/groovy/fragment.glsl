uniform float time;
varying vec2 vUv;
void main(void){
	vec2 position=vUv;
	float color=0.;
	color+=sin(position.x*cos(time/5.)*80.)+cos(position.y*cos(time/5.)*10.);
	color+=sin(position.y*sin(time/3.)*40.)+cos(position.x*sin(time/8.)*40.);
	color+=sin(position.x*sin(time/1.5)*10.)+sin(position.y*sin(time/12.)*80.);
	color*=sin(time/10.)*.5;
	gl_FragColor=vec4(vec3(color,color*.5,sin(color+time)*.75),1.);
}
