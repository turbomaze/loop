//Canvas bRUSH - tools for drawing to HTML5 canvases
//@author Anthony -- https://igliu.com
var Crush = (function() {
    return {
        clear: function(ctx, color) {
            ctx.fillStyle = color || 'white';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        },
        getColorStr: function(cols, opacity) {
            var mid = '('+cols[0]+','+cols[1]+','+cols[2];
            if (arguments.length === 2) {
                return 'rgba'+mid+','+opacity+')';
            } else {
                return 'rgb'+mid+')';
            }
        },
        getGradient: function(c1, c2, percent) {
            var ret = [0, 0, 0];

            for (var ai = 0; ai < 3; ai++) {
                ret[ai] = Math.floor(Math.sqrt(
                    percent*c1[ai]*c1[ai] +
                    (1 - percent)*c2[ai]*c2[ai]
                ))%256;
            }

            return ret;
        },
        fillEllipse: function(
            ctx, center, focusDist, majAxis, thickness, color, dir
        ) {
            color = color || 'red';
            dir = dir || 0; //0 means x is the long dimension

            var x = center[0];
            var y = center[1];
            var rx = majAxis;
            var ry = Math.sqrt(majAxis*majAxis - focusDist*focusDist);
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = thickness;
            ctx.beginPath();
            if (dir === 0) {
                ctx.ellipse(x, y, rx, ry, 0, 0, 2*Math.PI);
            } else {
                ctx.ellipse(x, y, ry, rx, 0, 0, 2*Math.PI);
            }
            ctx.fill();
            ctx.stroke();
        },
        fillTriangle: function(ctx, pts, color) {
            var triangle = new Path2D();
            triangle.moveTo.apply(triangle, pts[0]);
            triangle.lineTo.apply(triangle, pts[1]);
            triangle.lineTo.apply(triangle, pts[2]);
            ctx.fillStyle = color || 'rgba(0, 0, 255, 0.3)';
            ctx.fill(triangle);
        },
        drawPoint: function(ctx, pos, r, color) {
            ctx.fillStyle = color || 'rgba(255, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(pos[0], pos[1], r, 0, 2*Math.PI, true);
            ctx.closePath();
            ctx.fill();
        }
    };
})();
