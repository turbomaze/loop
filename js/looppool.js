/******************\
| Loop - Pool Game |
| @author Anthony  |
| @version 0.1     |
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
            new BilliardBall(CENTER, 'white')
        ];
        balls[0].vel = [2, 0];

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
            Crush.drawPoint(ctx, ball.pos, BALL_RAD, ball.color);
        });

        //update their positions
        balls.map(function(ball, ballIdx) {
            //simulate friction
            ball.vel = ball.vel.map(function(coord) {
                return 0.998*coord;
            });

            //appy velocity
            ball.pos = ball.pos.map(function(coord, idx) {
                return coord += balls[ballIdx].vel[idx];
            });

            //bound
            if (ball.pos[0] + ball.r >= CENTER[0]+MAJ_AXIS) {
                ball.pos[0] = CENTER[0]+MAJ_AXIS - ball.r;
                ball.vel[0] *= -1;
            } else if (ball.pos[0] - ball.r < CENTER[0]-MAJ_AXIS) {
                ball.pos[0] = CENTER[0]-MAJ_AXIS + ball.r;
                ball.vel[0] *= -1;
            }
        });

        requestAnimationFrame(render);
    }

    function drawLoopTable() {
        //draw the elliptical outline
        Crush.fillEllipse(
            ctx, CENTER, FOCUS_LEN,
            MAJ_AXIS, 3, BOARD_COLOR
        );
    }

    /***********
     * objects */
    function BilliardBall(pos, color) {
        this.pos = pos;
        this.color = color;
        this.r = BALL_RAD; //don't let this vary, this game isn't that complex
        this.vel = [0, 0]; //no velocity
    }

    /********************
     * helper functions */
    function $s(id) { //for convenience
        if (id.charAt(0) !== '#') return false;
        return document.getElementById(id.substring(1));
    }

    return {
        init: initLoopGame
    };
})();

window.addEventListener('load', LoopGame.init);
