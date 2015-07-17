/******************\
| Loop - Pool Game |
| @author Anthony  |
| @version 0.2     |
| @date 2015/07/16 |
| @edit 2015/07/16 |
\******************/

var LoopGame = (function() {
    'use strict';

    /**********
     * config */
    var DIMS = [720, 405]; //canvas dimensions
    var BALL_RAD = 7.77;
    var BOARD_COLOR = 'green';
    var ECCENTRICITY = 0.43;

    /*************
     * constants */
    var CENTER = [DIMS[0]/2, DIMS[1]/2]; //canvas center
    var MIN_AXIS = CENTER[1] - 2; //minor axis of the board
    var FOCUS_LEN = MIN_AXIS/Math.sqrt(Math.pow(ECCENTRICITY, -2)-1);
    var MAJ_AXIS = Math.sqrt(MIN_AXIS*MIN_AXIS + FOCUS_LEN*FOCUS_LEN);

    /*********************
     * working variables */
    var canvas, ctx;
    var balls;

    /******************
     * work functions */
    function initLoopGame() {
        //working variables
        canvas = $s('#canvas');
        canvas.width = DIMS[0];
        canvas.height = DIMS[1];
        ctx = canvas.getContext('2d');

        balls = [
            new BilliardBall([-50, 15], 'white'),
            new BilliardBall([70, 90], 'orange'),
            new BilliardBall([10, 40], '#DF2F3F'),
            new BilliardBall([0, -60], 'black')
        ];
        balls[0].vel = [2, -0.25];
        balls[1].vel = [1.2, 0.5];
        balls[2].vel = [-2.5, -0.1];
        balls[3].vel = [0.1, 1.4];

        //event listeners

        //draw the board
        requestAnimationFrame(render);
    }

    function render() {
        //draw the table
        Crush.clear(ctx, 'white');
        drawLoopTable();

        //draw all the balls
        balls.map(function(ball) {
            Crush.drawPoint(
                ctx, [ball.pos[0]+CENTER[0], ball.pos[1]+CENTER[1]],
                BALL_RAD, ball.color
            );
        });

        //update their positions
        balls.map(function(ball, ballIdx) {
            //simulate friction
            ball.vel = ball.vel.map(function(coord) {
                return 1*coord;
            });

            //appy velocity
            balls.map(function(ball) {
                ball.move();
            });

            //collisions with other balls
            for (var bi = 0; bi < balls.length; bi++) {
                for (var li = bi+1; li < balls.length; li++) {
                    if (balls[bi].isHitting(balls[li])) {
                        balls[bi].collideWith(balls[li]);
                    }
                }
            }

            //bound
            var distToWall = ball.getDistToWall();
            var distToCenter = -1;
            var wallCollision = false;
            if (distToWall < ball.r) {
                distToCenter = ball.getDistFromCenter();
                var change = distToCenter + distToWall - ball.r;
                change /= distToCenter;
                ball.pos = [change*ball.pos[0], change*ball.pos[1]];
                wallCollision = true;
            }

            //collide with the wall
            if (wallCollision) {
                var k = distToCenter + distToWall;
                k /= ball.getDistFromCenter();
                var collPt = [k*ball.pos[0], k*ball.pos[1]]; //collision point
                var x = collPt[0], y = collPt[1]; //ugh destructured asmts pls
                var dydx = -x*Math.pow(MIN_AXIS, 2);
                dydx /= y*Math.pow(MAJ_AXIS, 2);
                var normVec = normalize([1, -1/dydx]);
                var newVel = vecSub(ball.vel, scalarTimes(
                    2*dot(ball.vel, normVec),
                    normVec
                ));

                ball.vel = newVel;
            }
        });

        requestAnimationFrame(render);
    }

    function drawLoopTable() {
        //draw the elliptical shape
        Crush.fillEllipse(
            ctx, CENTER, FOCUS_LEN,
            MAJ_AXIS, 3, BOARD_COLOR
        );

        //highlight the focus points
        Crush.drawPoint(ctx, [CENTER[0]-FOCUS_LEN, CENTER[1]], 3, 'cyan');
        Crush.drawPoint(ctx, [CENTER[0]+FOCUS_LEN, CENTER[1]], 3, 'cyan');
    }

    /***********
     * objects */
    function BilliardBall(pos, color) {
        this.pos = pos;
        this.color = color;
        this.r = BALL_RAD; //don't let this vary, this game isn't that complex
        this.vel = [0, 0]; //no velocity

        this.move = function() {
            this.pos = [
                this.pos[0] + this.vel[0],
                this.pos[1] + this.vel[1]
            ];
        };
        this.getDistFromCenter = function() {
            //returns the distance from this ball to the center of the table
            return Math.sqrt(
                Math.pow(this.pos[0], 2) +
                Math.pow(this.pos[1], 2)
            );
        };
        this.getDistToWall = function(afafs) {
            //returns the distance from the ball to the side of the loop table
            //in the direction of the center of the table through the ball
            var theta = Math.atan2(this.pos[1], this.pos[0]+FOCUS_LEN);
            var rad_ = MAJ_AXIS*(1 - Math.pow(ECCENTRICITY, 2));
            rad_ /= 1 - ECCENTRICITY*Math.cos(theta);
            var x = rad_*Math.cos(theta) - FOCUS_LEN;
            var y = rad_*Math.sin(theta);
            return Math.sqrt(x*x + y*y) - this.getDistFromCenter();
        };
        this.isHitting = function(b) {
            var dist = Math.sqrt(
                Math.pow(this.pos[0] - b.pos[0], 2) +
                Math.pow(this.pos[1] - b.pos[1], 2)
            );
            return dist < 2*BALL_RAD;
        };
        this.collideWith = function(b) {
            var normSlope = (this.pos[1]-b.pos[1])/(this.pos[0]-b.pos[0]);
            var perpVec = normalize([1, normSlope]);
            var parallelVec = normalize([-normSlope, 1]);
            var newVel1 = vecAdd(
                b.vel,
                scalarTimes(
                    dot(parallelVec, vecSub(this.vel, b.vel)),
                    parallelVec
                )
            );
            var newVel2 = vecAdd(
                b.vel,
                scalarTimes(
                    dot(perpVec, vecSub(this.vel, b.vel)),
                    perpVec
                )
            );
            this.vel = newVel1;
            b.vel = newVel2;

            var overlap = 2 + 2*BALL_RAD - Math.sqrt(
                Math.pow(this.pos[0] - b.pos[0], 2) +
                Math.pow(this.pos[1] - b.pos[1], 2)
            );
            var offsetVec = scalarTimes(overlap/2, parallelVec);
            this.pos = vecAdd(this.pos, offsetVec);
            b.pos = vecSub(b.pos, offsetVec);
        };
    }

    /********************
     * helper functions */
    function scalarTimes(s, a) {
        return a.map(function(comp) {
            return s*comp;
        });
    }
    function vecAdd(a, b) {
        return a.map(function(comp, idx) {
            return comp + b[idx];
        });
    }
    function vecSub(a, b) {
        return a.map(function(comp, idx) {
            return comp - b[idx];
        });
    }
    function normalize(vec) {
        var mag = Math.sqrt(vec.reduce(function(acc, comp) {
            return acc + comp*comp;
        }, 0));
        return vec.map(function(comp) {
            return comp/mag;
        });
    }
    function dot(a, b) {
        return a.reduce(function(acc, el, idx) {
            return acc + el*b[idx];
        }, 0);
    }
    function $s(id) { //for convenience
        if (id.charAt(0) !== '#') return false;
        return document.getElementById(id.substring(1));
    }

    return {
        init: initLoopGame
    };
})();

window.addEventListener('load', LoopGame.init);
