import {Vector3} from "three";

import {Axis, Vector3_ZERO} from "w3g/threeutil";
import {get, free} from "w3g/utils";

export function test2Cupsules(p1, p2, v1, v2, r) { // http://marupeke296.com/COL_3D_No27_CapsuleCapsule.html
	const t = get(Vector3).subVectors(p2, p1);
	const la = get(Vector3).copy(v2).multiplyScalar(v1.dot(v2) / v2.dot(v2)).sub(v1);
	const la2 = la.dot(la);
	let df;
	if (la2 < 0.00001) {
		const p = get(Vector3).copy(p2).addScaledVector(v2, -(t.dot(v2) / v2.dot(v2)));
		const e1 = get(Vector3).addVectors(p1, v1);
		const e2 = get(Vector3).addVectors(p2, v2);
		df = Math.min(t.length(), e2.distanceTo(p1), p2.distanceTo(e1), e2.distanceTo(e1), p.distanceTo(p1));
		free(p, e1, e2);
	} else {
		const v22 = v2.dot(v2);
		const a = get(Vector3).subVectors(v2, t).multiplyScalar(t.dot(v2) / v22);
		const b = get(Vector3).copy(v1).multiplyScalar(Math.min(Math.max(la.dot(a) / la2, 0), 1));
		const c = get(Vector3).copy(p2).addScaledVector(v2, Math.min(Math.max(a.subVectors(b, t).dot(v2) / v22, 0), 1));
		a.addVectors(p1, b);
		df = c.distanceTo(a);
		free(a, b, c);
	}
	free(t, la);
	return df <= r;
};

export function testCupsuleSphere(pc, v, ps, r, usetmax) {
	const d = get(Vector3).subVectors(ps, pc);
	let t = Math.max(d.dot(v), 0);
	if (usetmax && t > 1) t = 1;
	d.copy(pc).addScaledVector(v, t);
	const ret = ps.distanceTo(d) <= r;
	free(d);
	return ret;
}

export function testOBBSphere(p1, p2, l, q, r) { // http://marupeke296.com/COL_3D_No12_OBBvsPoint.html
	const vec = get(Vector3).copy(Vector2_ZERO);
	const d = get(Vector3).subVectors(p2, p1);
	const direct = get(Vector3);
	for (axis of ["x", "y", "z"]) {
		if (l[axis] > 0) {
			direct.copy(Axis[axis]).applyQuaternion(q);
			const s = Math.abs(d.dot(direct) / l.x);
			if (s > 1) vec.add((1 - s) * l.x * direct);
		}
	}
	const ret = vec.length() <= r;
	free(direct, vec, d);
	return ret;
}
