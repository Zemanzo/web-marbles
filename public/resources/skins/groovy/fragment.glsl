uniform float time;
varying vec2 vUv;
void main(void){
	vec2 position=vUv;
	float color=0.;
	color+=sin(position.x*cos(time/15.)*80.)+cos(position.y*cos(time/15.)*10.);
	color+=sin(position.y*sin(time/10.)*40.)+cos(position.x*sin(time/25.)*40.);
	color+=sin(position.x*sin(time/5.)*10.)+sin(position.y*sin(time/35.)*80.);
	color*=sin(time/10.)*.5;
	gl_FragColor=vec4(vec3(color,color*.5,sin(color+time/3.)*.75),1.);
}
