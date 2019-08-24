uniform float time;
uniform sampler2D texture1;
uniform sampler2D texture2;
varying vec2 vUv;
void main(void){
	vec2 position=-1.+2.*vUv;
	vec4 noise=texture2D(texture1,vUv);
	vec2 T1=vUv+vec2(1.5,-1.5)*time*.06;
	vec2 T2=vUv+vec2(-.5,2.)*time*.03;
	T1.x+=noise.x*2.;
	T1.y+=noise.y*2.;
	T2.x-=noise.y*.2;
	T2.y+=noise.z*.2;
	float p=texture2D(texture1,T1*2.).a;
	vec4 color=texture2D(texture2,T2*2.);
	vec4 temp=color*(vec4(p,p,p,p)*2.)+(color*color-.1);
	if(temp.r>1.){temp.bg+=clamp(temp.r-2.,0.,100.);}
	if(temp.g>1.){temp.rb+=temp.g-1.;}
	if(temp.b>1.){temp.rg+=temp.b-1.;}
	gl_FragColor=temp;
}
