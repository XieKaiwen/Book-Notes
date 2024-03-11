// Sample binary data
const binaryData = Buffer.from([0b01010101, 0b11001100, 0b00110011, 0b11110000]);

// Convert binary data to Base64
const base64Data = binaryData.toString('base64');

console.log('Binary Data:', binaryData);
console.log('Base64 Data:', base64Data);

const a = '1';
if(a){
    console.log("hi");
}
