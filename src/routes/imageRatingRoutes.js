import { asyncHandler } from '../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../errors/CustomErrors.js';
import databaseClient from '../database/PrismaClient.js';

const prisma = databaseClient.getClient();

// Rate an image
export const rateImage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rating } = req.body;
    const userId = req.user?.id || 'anonymous';

    // Validation
    if (!id) {
        throw new ValidationError('Image ID is required');
    }

    if (!rating || rating < 1 || rating > 5) {
        throw new ValidationError('Rating must be between 1 and 5');
    }

    // Check if image exists
    const image = await prisma.image.findUnique({
        where: { id }
    });

    if (!image) {
        throw new NotFoundError('Image not found');
    }

    // Update image rating
    const updatedImage = await prisma.image.update({
        where: { id },
        data: { rating },
        select: {
            id: true,
            prompt: true,
            imageUrl: true,
            provider: true,
            rating: true,
            createdAt: true
        }
    });

    res.json({
        success: true,
        message: 'Image rated successfully',
        data: {
            image: updatedImage
        }
    });
});

// Get image by ID
export const getImage = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ValidationError('Image ID is required');
    }

    const image = await prisma.image.findUnique({
        where: { id },
        select: {
            id: true,
            userId: true,
            prompt: true,
            original: true,
            imageUrl: true,
            provider: true,
            guidance: true,
            model: true,
            rating: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (!image) {
        throw new NotFoundError('Image not found');
    }

    res.json({
        success: true,
        data: {
            image
        }
    });
});

// Get image statistics
export const getImageStats = asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    // Get total count
    const totalCount = await prisma.image.count();

    // Get user count (if authenticated)
    let userCount = 0;

    if (userId) {
        userCount = await prisma.image.count({
            where: { userId }
        });
    }

    // Get rating distribution
    const ratingStats = await prisma.image.groupBy({
        by: ['rating'],
        _count: {
            rating: true
        },
        where: {
            rating: {
                not: null
            }
        }
    });

    // Format rating stats
    const ratingDistribution = {};

    ratingStats.forEach(stat => {
        ratingDistribution[stat.rating] = stat._count.rating;
    });

    // Calculate average rating
    const avgRatingResult = await prisma.image.aggregate({
        where: {
            rating: {
                not: null
            }
        },
        _avg: {
            rating: true
        }
    });

    res.json({
        success: true,
        data: {
            count: totalCount,
            userCount,
            ratingDistribution,
            averageRating: avgRatingResult._avg.rating || 0
        }
    });
});

// Setup image rating routes
export const setupImageRatingRoutes = app => {
    app.get('/api/images/stats', getImageStats); // Must come before /:id route
    app.post('/api/images/:id/rating', rateImage);
    app.get('/api/images/:id', getImage);
};
