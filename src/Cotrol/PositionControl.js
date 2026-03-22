import Position from '../Model/Position.js';
import db from "../db/db";
class PositionControl {

        async findAllPositions() {
        const positionInstance = new Position();
        try {
            return positionInstance.getAllPositions(db);
        } catch (e) {
            throw e;
        }
    }

    async findPositionById(id) {
        const positionInstance = new Position();    
        try {
            return positionInstance.getPositionById(id, db);
        } catch (e) {
            throw e;
        }
    }

}

export default PositionControl;