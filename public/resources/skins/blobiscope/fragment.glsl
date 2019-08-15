uniform float time;
varying vec2 vUv;

#define SPEED .005
#define SHAPES 200.
#define SHARPNESS 2.5

// Multiple the result of this function call to rotate the coordinates by the given angle.
#define rotate(angle)mat2(cos(angle),-sin(angle),sin(angle),cos(angle));

void main(void){
	vec2 uv=vUv;
	float mask=0.;
	for(float i=0.;i<6.;i+=1.){
		uv*=rotate(time/1000.)

		mask+=sin((uv.y-(time*float(SPEED)))*SHAPES/2.)*SHARPNESS;

	}

	// Time varying pixel color
	vec3 col=vec3(mask);

	// Output to screen
	gl_FragColor=vec4(col,1.);
}
