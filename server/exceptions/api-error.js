export default class ApiError extends Error {
    status;
    errors;

    constructor(status, message, errors) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
    
    static BadRequest(message, errors = []) {
        return new ApiError(400, message, errors);
    }

    static UnauthorizedError(message = '') {
        return new ApiError(401, message ? message : 'User isn\'t authorized');
    }

    static ForbiddenError(message = '') {
        return new ApiError(403, message ? message : 'Not enough access')
    }

    static NotFoundError(message = '') {
        return new ApiError(404, message ? message : 'Not found')
    }
}