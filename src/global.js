
var SCREEN_WIDTH = 640;
var SCREEN_HEIGHT = 960;
var SCREEN_CENTER_X = SCREEN_WIDTH / 2;
var SCREEN_CENTER_Y = SCREEN_HEIGHT / 2;

//3軸
var Axis = {
	x : new THREE.Vector3(1,0,0).normalize(),
	y : new THREE.Vector3(0,1,0).normalize(),
	z : new THREE.Vector3(0,0,1).normalize()
};

var opt = function(base, key) {
	if (base[key] === undefined) return function() {};
	if (base[key] instanceof Function) return base[key].bind(base);
	return base[key];
};
