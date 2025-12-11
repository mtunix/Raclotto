export class Util {
    static isNumeric(value: unknown): boolean {
        return typeof value === 'number' && !isNaN(value);
    }
}
