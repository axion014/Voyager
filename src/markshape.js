phina.define('MarkShape', {
	superClass: 'phina.display.Shape',
	init: function(options) {
		options = ({}).$safe(options, {
			backgroundColor: 'transparent',
			stroke: '#444',
			strokeWidth: 1,

			width: 16,
			height: 16
		});
		this.superInit(options);
	},

	render: function(canvas) {
		canvas.clearColor(this.backgroundColor);
		canvas.transformCenter();

		if (this.isStrokable()) {
			canvas.lineWidth = this.strokeWidth;
			canvas.strokeStyle = this.stroke;
			canvas.drawLine(-this.width, 0, this.width, 0);
			canvas.drawLine(0, -this.height, 0, this.height);
		}
	},

	initThreeMesh: function() {
		var group = new THREE.Group();
		var geometry = new THREE.PlaneGeometry(1, 1);
		group.vertical = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
		group.horizontal = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
		group.add(group.vertical);
		group.add(group.horizontal);
		return group;
	},
	updateThreeMesh: function(group, alpha) {
		function setColor(material, str, opacity) {
	    if (!str) {
	      material.visible = false;
	      return;
	    }
	    var color = phina.util.Color().setFromString(str);
	    if (!color.a) {
	      material.visible = false;
	      return;
	    }
	    material.color = new THREE.Color(color.r / 255, color.g / 255, color.b / 255);
	    color.a *= opacity !== undefined ? opacity : 1;
	    material.opacity = color.a;
	    material.transparent = color.a !== 1;
	    material.visible = true;
	  }
		setColor(group.vertical.material, this.stroke, alpha);
		group.vertical.scale.set(this.strokeWidth * this.scaleX, this.height * this.scaleY, 1);
		setColor(group.horizontal.material, this.stroke, alpha);
		group.horizontal.scale.set(this.width * this.scaleX, this.strokeWidth * this.scaleY, 1);
	}
});
