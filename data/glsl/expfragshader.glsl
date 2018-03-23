varying vec2 vUv;
varying float noise;
uniform sampler2D tExplosion;
uniform float alpha;

float random(vec3 scale, float seed){
	return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

void main() {
	// get a random offset
	// lookup vertically in the texture, using noise and offset
	// to get the right RGB colour
	gl_FragColor = vec4(texture2D(tExplosion, vec2(0, 1.0 - 1.3 * noise + .01 * random(vec3(12.9898, 78.233, 151.7182), 0.0))).rgb, alpha);
}
