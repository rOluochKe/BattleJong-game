"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Node imports.
var path_1 = __importDefault(require("path"));
// Library imports.
var express_1 = __importDefault(require("express"));
var ws_1 = __importDefault(require("ws"));
// Our collection players.  Each element is an object: { pid, score, stillPlaying }
var players = {};
// Construct Express server for client resources.
var app = (0, express_1.default)();
app.use("/", express_1.default.static(path_1.default.join(__dirname, "../../client/dist")));
app.listen(80, function () {
    console.log("BattleJong Express server ready");
});
// Construct WebSocket server.
var wsServer = new ws_1.default.Server({ port: 8080 }, function () {
    console.log("BattleJong WebSocket server ready");
});
wsServer.on("connection", function (socket) {
    console.log("Player connected");
    // First things first: hook up message handler.
    socket.on("message", function (inMsg) {
        console.log("Message: ".concat(inMsg));
        var msgParts = inMsg.toString().split("_");
        var message = msgParts[0];
        var pid = msgParts[1];
        switch (message) {
            // When a tile pair is matched: match_<pid>_<points>
            case "match":
                players[pid].score += parseInt(msgParts[2]);
                // Broadcast score updates to both players.
                wsServer.clients.forEach(function each(inClient) {
                    inClient.send("update_".concat(pid, "_").concat(players[pid].score));
                });
                break;
            // When the player dead-ends or clears: done_<pid>
            case "done":
                players[pid].stillPlaying = false;
                // See if both players are done playing.
                var playersDone = 0;
                for (var player in players) {
                    if (players.hasOwnProperty(player)) {
                        if (!players[player].stillPlaying) {
                            playersDone++;
                        }
                    }
                }
                // They are both done playing, now see who won.
                if (playersDone === 2) {
                    var winningPID_1;
                    var pids = Object.keys(players);
                    if (players[pids[0]].score > players[pids[1]].score) {
                        winningPID_1 = pids[0];
                    }
                    else {
                        winningPID_1 = pids[1];
                    }
                    // Broadcast the outcome to both players.
                    wsServer.clients.forEach(function each(inClient) {
                        inClient.send("gameOver_".concat(winningPID_1));
                    });
                }
                break;
        } /* End switch. */
    }); /* End message handler. */
    // Now, construct PID for this player and add the player to the collection.
    var pid = "pid".concat(new Date().getTime());
    players[pid] = { score: 0, stillPlaying: true };
    // Inform the player that we're connected and give them their ID.
    socket.send("connected_".concat(pid));
    // If there are now two players, transition state on the clients.  This broadcasts to ALL clients, even the one
    // that sent the current message, which is what we want in this case.
    if (Object.keys(players).length === 2) {
        // Shuffle the tiles in the layout, so we can send the layout to both clients.
        var shuffledLayout_1 = shuffle();
        wsServer.clients.forEach(function each(inClient) {
            inClient.send("start_".concat(JSON.stringify(shuffledLayout_1)));
        });
    }
}); /* End WebSocket server construction. */
// ---------------------------------------- Game code. ----------------------------------------
// 0 = no tile, 1 = tile.
// Each layer is 15x9 (135 per layer, 675 total).  Tiles are 36x44.
// When board is shuffled, all 1's become 101-142 (matching the 42 tile type filenames).
// Tile 101 is wildcard.
var layout = [
    /* Layer 1. */
    [
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    ],
    /* Layer 2. */
    [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    /* Layer 3. */
    [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    /* Layer 4. */
    [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    /* Layer 5. */
    [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
]; /* End layout. */
/**
 * Shuffles the tiles in the layout, randomizing tile placement.  Note that this uses the American-style
 * totally random approach, which means that not every shuffle will be "winnable" (meaning that there may be no
 * path to completely clear the board).
 *
 * @return A shuffled layout.
 */
function shuffle() {
    // Clone the layout.
    var cl = layout.slice(0);
    // We need to ensure no more than 4 wildcards are placed, so this will count them.
    var numWildcards = 0;
    // Iterate over the entire board, randomly choosing a tile for each position that isn't supposed to be blank.
    var numTileTypes = 42;
    for (var l = 0; l < cl.length; l++) {
        var layer = cl[l];
        for (var r = 0; r < layer.length; r++) {
            var row = layer[r];
            for (var c = 0; c < row.length; c++) {
                var tileVal = row[c];
                // tileVal > 0 indicates there is supposed to be a tile at this position.
                if (tileVal === 1) {
                    row[c] = Math.floor(Math.random() * numTileTypes) + 101;
                    // If this is a wildcard and no more are allowed then bump to the next tile type, otherwise bump
                    // wildcard count.  Doing this is a cheap way of having to randomly select a tile again, which at this
                    // point could actually be a little tricky if we want to avoid duplicate code.
                    if (row[c] === 101 && numWildcards === 3) {
                        row[c] = 102;
                    }
                    else {
                        numWildcards += numWildcards;
                    }
                } /* End tileVal > 0 check. */
            } /* End column iteration. */
        } /* End row iteration. */
    } /* End layer iteration. */
    return cl;
} /* End shuffle(). */
//# sourceMappingURL=server.js.map