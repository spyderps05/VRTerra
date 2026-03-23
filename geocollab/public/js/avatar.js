// Avatar registration and setup
document.addEventListener('DOMContentLoaded', () => {
    if (typeof NAF !== 'undefined') {
        NAF.schemas.add({
            template: '#avatar-template',
            components: [
                'position',
                'rotation'
            ]
        });
    }
});

AFRAME.registerComponent('avatar-color', {
    init: function () {
        // Give each avatar a random color based on list
        const colors = ['#4CC3D9', '#FFC65D', '#7BC8A4', '#F16745', '#93648D'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        // Find the sphere inside the template
        const sphere = this.el.querySelector('a-sphere');
        if (sphere) {
            sphere.setAttribute('material', 'color', color);
        }
    }
});
