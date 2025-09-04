/**
 * Payment Package Service
 * Manages credit packages and pricing
 */

const CREDIT_PACKAGES = [
    {
        id: 'starter',
        name: 'Starter Pack',
        credits: 10,
        price: 999, // $9.99 in cents
        description: 'Perfect for trying out AI image generation',
        popular: false
    },
    {
        id: 'pro',
        name: 'Pro Pack',
        credits: 50,
        price: 3999, // $39.99 in cents
        description: 'Great for regular users',
        popular: true
    },
    {
        id: 'enterprise',
        name: 'Enterprise Pack',
        credits: 200,
        price: 14999, // $149.99 in cents
        description: 'For power users and businesses',
        popular: false
    }
];

/**
 * Get all available credit packages
 */
const getAllPackages = () => CREDIT_PACKAGES;

/**
 * Get package by ID
 */
const getPackage = packageId => {
    const package_ = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);

    if (!package_) {
        throw new Error(`Package not found: ${packageId}`);
    }

    return package_;
};

/**
 * Get default package (Pro Pack)
 */
const getDefaultPackage = () => getPackage('pro');

/**
 * Get package pricing information
 */
const getPackagePricing = () => CREDIT_PACKAGES.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    credits: pkg.credits,
    price: pkg.price,
    pricePerCredit: (pkg.price / pkg.credits).toFixed(2),
    description: pkg.description,
    popular: pkg.popular
}));

export default {
    getAllPackages,
    getPackage,
    getDefaultPackage,
    getPackagePricing
};
