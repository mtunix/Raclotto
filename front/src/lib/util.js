export class Util {
    static isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }
}
