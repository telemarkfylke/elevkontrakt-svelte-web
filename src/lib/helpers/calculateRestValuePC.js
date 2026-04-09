const totalValue = (price) => {
    const maxAllowedValue = 5000

    // Ensure the price does not exceed the maximum allowed value
    if(price > maxAllowedValue) {
        return maxAllowedValue
    }
    return price
}

export function calculateRestValuePC (totalPCValue, grade) {

    // Grade VG1,VG2 and VG3

    // VG1 students 3/3 of value
    if(grade === "VG1") {
        return parseInt(totalValue(totalPCValue))
    }
    
    // VG2 students 2/3 of value
    if(grade === "VG2") {
        return parseInt(totalValue((Math.round(totalPCValue / 3) * 2)))
    }

    // VG3 students 1/3 of value
    if(grade === "VG3") {
        return parseInt(totalValue((Math.round(totalPCValue / 3) * 1)))
    }

    return 0
}