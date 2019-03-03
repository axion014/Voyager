uniform vec3 glowColor;
varying float intensity;
void main() {
	gl_FragColor = vec4(glowColor, intensity);
}
