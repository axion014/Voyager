
phina.define('fly.DirectionShape', {
	superClass: 'phina.display.Shape',

	init: function(options) {
		options = ({}).$safe(options, {
			backgroundColor: 'transparent',
			fill: '#ff5050',
			stroke: '#aaa',
			strokeWidth: 2,

			width: 16,
			height: 32
		});
		this.superInit(options);
	},

	prerender: function(canvas) {
		canvas.beginPath()
			.moveTo(0, this.height)
			.lineTo(this.width, -this.height)
			.lineTo(-this.width, -this.height)
			.closePath();
	},

	initThreeMesh: function() {
		var group = new THREE.Group();
		var shape = new THREE.Shape();
		shape.moveTo(0, -1)
		shape.lineTo(1, 1)
		shape.lineTo(-1, 1)
		shape.lineTo(0, -1);
		var geometry = new THREE.ShapeGeometry(shape);
		group.fill = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
		group.fill.position.z = 1;
		group.stroke = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
		group.add(group.stroke);
		group.add(group.fill);
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
		setColor(group.fill.material, this.fill, alpha);
		group.fill.scale.set(this.width * this.scaleX, this.height * this.scaleY, 1);
		setColor(group.stroke.material, this.stroke, alpha);
		group.stroke.scale.set((1 + this.strokeWidth / this.width) * this.width * this.scaleX, (1 +   this.strokeWidth / this.height) * this.height * this.scaleY, 1);
	}


});
