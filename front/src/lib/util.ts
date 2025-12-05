export class Util {
    static isNumeric(value: any): boolean {
        return typeof value === 'number' && !isNaN(value);
    }
}
