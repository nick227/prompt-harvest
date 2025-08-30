// Mock Canvas for Jest tests
module.exports = {
  createCanvas: jest.fn(() => ({
    getContext: jest.fn(() => ({
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Array(4) })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({ data: new Array(4) })),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn()
    })),
    toBuffer: jest.fn(() => Buffer.alloc(0)),
    toDataURL: jest.fn(() => 'data:image/png;base64,'),
    width: 0,
    height: 0
  })),
  loadImage: jest.fn(() => Promise.resolve({
    width: 100,
    height: 100
  })),
  registerFont: jest.fn()
};
