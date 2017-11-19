fly.colCup2D3 = function(p1, p2, v1, v2, r) { // http://marupeke296.com/COL_3D_No27_CapsuleCapsule.html
	var t = p2.clone().sub(p1);
	var la = v2.clone().multiplyScalar(v1.clone().dot(v2) / v2.clone().dot(v2)).sub(v1);
	var la2 = la.clone().dot(la);
	if (la2 < 0.00001) {
		var min = p2.clone().sub(p1).length();
		min = Math.min(min, p2.clone().add(v2).sub(p1).length());
		min = Math.min(min, p2.clone().sub(p1.clone().add(v1)).length());
		min = Math.min(min, p2.clone().add(v2).sub(p1.clone().add(v1)).length());
		var p = p2.clone().add(v2.multiplyScalar(t.clone().dot(v2) / v2.clone().dot(v2) * -1));
		var df = Math.min(min, p.sub(p1).length());
	} else {
		var d = v2.clone().dot(v2);
		var a = Math.clamp(la.clone().dot(t.clone().dot(v2) / d * v2.clone().sub(t)) / la2, 0, 1);
		var b = Math.clamp(v1.clone().multiplyScalar(a).sub(t).dot(v2) / d, 0, 1);
		var df = p2.clone().add(v2.clone().multiplyScalar(b)).sub(p1.clone().add(v1.clone().multiplyScalar(a))).length();
	}
	return df <= r;
};

fly.colcupsphere = function(pc, v, ps, r, usetmax) {
	var t = Math.max(ps.clone().sub(pc).dot(v), 0);
	if (usetmax && t > 1) t = 1;
	return ps.clone().sub(pc.clone().addScaledVector(v, t)).length() <= r;
};

fly.colobbsphere = function(p1, p2, l, q, r) { // http://marupeke296.com/COL_3D_No12_OBBvsPoint.html
	var vec = new THREE.Vector3(0, 0, 0);
	var d = p2.clone().sub(p1);
	if (l.x > 0) {
		var direct = Axis.x.clone().applyQuaternion(q);
		var s = Math.abs(d.dot(direct) / l.x);
		if (s > 1) vec.add((1 - s) * l.x * direct);
	}
	if (l.y > 0) {
		direct = Axis.y.clone().applyQuaternion(q);
		s = Math.abs(d.dot(direct) / l.y);
		if (s > 1) vec.add((1 - s) * l.y * direct);
	}
	if (l.z > 0) {
		direct = Axis.z.clone().applyQuaternion(q);
		s = Math.abs(d.dot(direct) / l.z);
		if (s > 1) vec.add((1 - s) * l.z * direct);
	}
	return vec.length() <= r;
};
