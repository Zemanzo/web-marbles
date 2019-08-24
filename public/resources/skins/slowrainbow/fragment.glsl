uniform float time;
varying vec2 vUv;
void main(void){
	vec2 position=-1.+2.*vUv;
	float red=abs(sin(position.y+time/4.));
	float green=abs(sin(position.y+time/3.2));
	float blue=abs(sin(position.y+time/2.6));
	gl_FragColor=vec4(red,green,blue,1.);
}
