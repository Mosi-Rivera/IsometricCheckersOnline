import { Schema, type, ArraySchema } from "@colyseus/schema";

export class GameState extends Schema {
    @type("string") playerOne: string;
    @type("string") currentTurn: string;
    @type(["number"]) board: ArraySchema<number> = new ArraySchema(
        0,1,0,2,0,3,0,4,
        5,0,6,0,7,0,8,0,
        0,9,0,10,0,11,0,12,
        0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,
        13,0,14,0,15,0,16,0,
        0,17,0,18,0,19,0,20,
        21,0,22,0,23,0,24,0
    );
    @type("boolean") waiting = true;
}