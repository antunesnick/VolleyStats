import Position from '../Model/Position.js';
import db from "../db/db.js";
class PositionControl {
    static #instance = null;

    static getInstance() { 
        if (!PositionControl.#instance) {
            PositionControl.#instance = new PositionControl();
        }
        return PositionControl.#instance;
       }

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