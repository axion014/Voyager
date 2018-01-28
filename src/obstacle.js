phina.define('ObstacleManager', {
	superClass: 'SimpleUpdater',

	init: function(ts) {
		this.superInit();
		this.threescene = ts;
	},

	create: function(p, q, s) {
		var obstacle = THREE.$extend(new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), new THREE.MeshPhongMaterial({
			color: '#888888'
		})), {position: p, quaternion: q, size: s});
		this.threescene.add(obstacle);
		this.elements.push(obstacle);
		return obstacle;
	},

	update: function() {
	},

	removeObstacle: function(i) {
		this.get(i).parent.remove(this.get(i));
		this.remove(i);
	}
});
