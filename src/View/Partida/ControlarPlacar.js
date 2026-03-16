
class GameEvent {
    constructor(playerId) {
        this.playerId = playerId;
    }
}

class GameAction extends GameEvent {
    constructor(playerId, type) {
        super(playerId);
        this.type = type;
    }
}

class GameSubstitution extends GameEvent {
    constructor(playerId, subPlayerId) {
        super(playerId);
        this.subPlayerId = subPlayerId;
    }
}

class GamePoint {
    constructor({ gameId = null, team, events = [] }) {
        this.gameId = gameId;
        this.team = team;
        this.events = events;
        this.createdAt = new Date().toISOString();
    }
}

const gamePoints = [];

function attributeGamePoint(game, team, gEvents = []) {
    const events = Array.isArray(gEvents) ? gEvents : [gEvents];
    const point = new GamePoint({
        gameId: game && game.id ? game.id : null,
        team,
        events,
    });

    gamePoints.push(point);

    if (game && typeof game === 'object' && team != null) {
        if (!game.score || typeof game.score !== 'object') {
            game.score = {};
        }

        const currentScore = Number(game.score[team]) || 0;
        game.score[team] = currentScore + 1;
    }

    return point;
}

function getGamePoints(gameId = null) {
    if (gameId == null) {
        return [...gamePoints];
    }

    return gamePoints.filter((point) => point.gameId === gameId);
}

function clearGamePoints() {
    gamePoints.length = 0;
}

export {
    GameEvent,
    GameAction,
    GameSubstitution,
    GamePoint,
    getGamePoints,
    clearGamePoints,
};

export default attributeGamePoint;