varying float noise;
uniform sampler2D tExplosion;
uniform float opacity;

float random(vec3 scale, float seed){
	return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

void main() {
	// get a random offset
	// lookup vertically in the texture, using noise and offset
	// to get the right RGB colour
	gl_FragColor = vec4(texture2D(tExplosion, vec2(0, 0.7 - 0.5 * noise + .01 * random(vec3(12.9898, 78.233, 151.7182), 0.0))).rgb, opacity);
}
