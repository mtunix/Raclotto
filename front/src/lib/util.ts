export class Util {
    static isNumeric(value: unknown): boolean {
        return typeof value === 'number' && !isNaN(value);
    }

    static isMobile(): boolean {
        // Check for mobile devices
        if (typeof window === 'undefined') return false;
        
        // Check user agent
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
        if (mobileRegex.test(userAgent)) return true;
        
        // Check screen width (mobile typically < 768px)
        if (window.innerWidth < 768) return true;
        
        // Check for touch capability (not always reliable but helps)
        if ('ontouchstart' in window || (navigator as any).maxTouchPoints > 0) {
            // Additional check: if it's a small screen with touch, likely mobile
            if (window.innerWidth < 1024) return true;
        }
        
        return false;
    }

    static isLowPerformanceDevice(): boolean {
        // Detect low-end devices that need more aggressive optimizations
        if (typeof window === 'undefined') return false;
        
        // Check for mobile
        if (Util.isMobile()) {
            // Check for low memory devices (approximate)
            const hardwareConcurrency = (navigator as any).hardwareConcurrency || 4;
            const deviceMemory = (navigator as any).deviceMemory || 4;
            
            // Low-end if: mobile AND (low CPU cores OR low memory)
            return hardwareConcurrency <= 4 || deviceMemory <= 2;
        }
        
        return false;
    }
}
