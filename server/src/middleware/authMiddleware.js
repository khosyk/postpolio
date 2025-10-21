const authService = require('../services/authService');

// Socket.IO 인증 미들웨어
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const user = await authService.verifyToken(token);
    
    if (!user) {
      return next(new Error('Invalid token'));
    }

    // 사용자 정보를 소켓에 저장
    socket.data.userId = user.id;
    socket.data.email = user.email;
    
    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication failed'));
  }
};

// Express 인증 미들웨어
const expressAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required'
      });
    }

    const user = await authService.verifyToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Express auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

module.exports = {
  socketAuthMiddleware,
  expressAuthMiddleware
};
