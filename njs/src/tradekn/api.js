const axios = require('axios');
const crypto = require('crypto');
const utf8 = require('utf8');
const qs = require('qs');

const KrakenFuturesApiClientV3 = ({
	apiKey,
	apiSecret,
	isTestnet = false,
	timeout,
}) => {
	if (!apiKey || !apiSecret) {
		throw new Error('API Key and API Secret are required.');
	}

	const BASE_URL = isTestnet
		? 'https://demo-futures.kraken.com'
		: 'https://futures.kraken.com';

	let nonceCounter = 0;

	const createNonce = () => {
		const timestamp = Date.now();

		nonceCounter = (nonceCounter + 1) % 10000;

		return `${timestamp}${String(nonceCounter).padStart(5, '0')}`;
	};

	const isEmpty = (object) =>
		object == null || Object.keys(object).length === 0;

	// Reference: https://docs.kraken.com/api/docs/guides/futures-rest#authent
	const signRequest = (endpoint, nonce, postData = '') => {
		// Step 1: Extract the path from the endpoint starting from '/api' and
		// concatenate postData + Nonce + sanitized endpointPath
		const endpointPath = endpoint.slice(endpoint.indexOf('/api'));
		const concatenatedMessage = `${postData}${nonce}${endpointPath}`;

		// Step 2: Hash the result of step 1 with the SHA-256 algorithm
		const sha256Hash = crypto
			.createHash('sha256')
			.update(utf8.encode(concatenatedMessage))
			.digest();

		// Step 3: Base64-decode your apiSecret
		const decodedApiSecret = Buffer.from(apiSecret, 'base64');

		// Step 4: Use the result of step 3 to hash the result of step 2 with the HMAC-SHA-512 algorithm
		const hmacSha512Hash = crypto
			.createHmac('sha512', decodedApiSecret)
			.update(sha256Hash)
			.digest();

		// Step 5: Base64-encode the result of step 4
		return hmacSha512Hash.toString('base64');
	};

	const prepareData = (data, isBatch = false) => {
		if (isBatch) {
			return `json=${JSON.stringify(data)}`;
		} else {
			return qs.stringify(data);
		}
	};

	const createHeaders = ({ isPrivate, endpoint, data, isBatch = false }) => {
		const nonce = isPrivate ? createNonce() : null;
		const baseHeaders = { Accept: 'application/json' };
		const hasData = !isEmpty(data);
		const postData = hasData ? prepareData(data, isBatch) : '';

		const privateHeaders = isPrivate
			? {
					APIKey: apiKey,
					Nonce: nonce,
					Authent: signRequest(endpoint, nonce, postData),
				}
			: {};

		const contentTypeHeader = hasData
			? {
					'Content-Type': 'application/x-www-form-urlencoded',
				}
			: {};

		return { ...baseHeaders, ...privateHeaders, ...contentTypeHeader };
	};

	const createRequestConfig = ({
		method,
		endpoint,
		headers,
		customHeaders,
		data,
		isBatch = false,
	}) => ({
		method,
		maxBodyLength: Infinity,
		url: `${BASE_URL}${endpoint}`,
		headers: { ...headers, ...customHeaders },
		timeout,
		...(!isEmpty(data) && { data: prepareData(data, isBatch) }),
	});

	const throwRequestError = (error, method, endpoint) => {
		const status = error.response?.status || 'N/A';
		const errors = error.response?.data?.errors || [];
		const message = error.message || 'Unknown error occurred';

		throw new Error(
			`Error during ${method} request to ${endpoint}: Status ${status}, Errors: ${JSON.stringify(
				errors,
			)}, Message: ${message}`,
		);
	};

	const makeRequest = async ({
		method = 'GET',
		endpoint,
		data,
		customHeaders = {},
		isPrivate = false,
		isBatch = false,
	}) => {
		const headers = createHeaders({
			isPrivate,
			method,
			endpoint,
			data,
			isBatch,
		});

		const config = createRequestConfig({
			method,
			endpoint,
			headers,
			customHeaders,
			data,
			isBatch,
		});

		try {
			const { data: responseData } = await axios.request(config);

			if (responseData.result === 'error') {
				throw new Error(`API Error: ${responseData.error}`);
			}

			return responseData;
		} catch (error) {
			throwRequestError(error, method, endpoint);
		}
	};

	const makePrivateRequest = async ({
		method = 'GET',
		endpoint,
		data,
		isBatch = false,
		customHeaders = {},
	}) =>
		makeRequest({
			method,
			endpoint,
			data,
			customHeaders,
			isBatch,
			isPrivate: true,
		});

	// Public endpoints
	const getTickers = async () =>
		makeRequest({ endpoint: '/derivatives/api/v3/tickers' });

	const getTickerBySymbol = async (symbol) =>
		makeRequest({ endpoint: `/derivatives/api/v3/tickers/${symbol}` });

	const getInstruments = async () =>
		makeRequest({ endpoint: '/derivatives/api/v3/instruments' });

	// Private endpoints
	const getAccounts = async () =>
		makePrivateRequest({
			endpoint: '/derivatives/api/v3/accounts',
		});

	const getOpenPositions = async () =>
		makePrivateRequest({
			endpoint: '/derivatives/api/v3/openpositions',
		});

	const getOpenOrders = async () =>
		makePrivateRequest({
			endpoint: '/derivatives/api/v3/openorders',
		});

	const sendOrder = async ({
		processBefore,
		orderType,
		symbol,
		side,
		size,
		limitPrice,
		stopPrice,
		cliOrdId,
		triggerSignal,
		reduceOnly,
		trailingStopMaxDeviation,
		trailingStopDeviationUnit,
		limitPriceOffsetValue,
		limitPriceOffsetUnit,
	}) =>
		makePrivateRequest({
			method: 'POST',
			endpoint: '/derivatives/api/v3/sendorder',
			data: {
				processBefore,
				orderType,
				symbol,
				side,
				size,
				limitPrice,
				stopPrice,
				cliOrdId,
				triggerSignal,
				reduceOnly,
				trailingStopMaxDeviation,
				trailingStopDeviationUnit,
				limitPriceOffsetValue,
				limitPriceOffsetUnit,
			},
		});

	const batchOrder = async (orders) =>
		makePrivateRequest({
			method: 'POST',
			endpoint: '/derivatives/api/v3/batchorder',
			data: {
				batchOrder: orders,
			},
			isBatch: true,
		});

	const editOrder = async ({
		processBefore,
		orderId,
		cliOrdId,
		size,
		limitPrice,
		stopPrice,
		trailingStopMaxDeviation,
		trailingStopDeviationUnit,
	}) =>
		makePrivateRequest({
			method: 'POST',
			endpoint: '/derivatives/api/v3/editorder',
			data: {
				processBefore,
				orderId,
				cliOrdId,
				size,
				limitPrice,
				stopPrice,
				trailingStopMaxDeviation,
				trailingStopDeviationUnit,
			},
		});

	const cancelOrder = async (orderId, cliOrdId) =>
		makePrivateRequest({
			method: 'POST',
			endpoint: '/derivatives/api/v3/cancelorder',
			data: { order_id: orderId, cliOrdId },
		});

	const cancelAllOrders = async (symbol) =>
		makePrivateRequest({
			method: 'POST',
			endpoint: '/derivatives/api/v3/cancelallorders',
			data: { symbol },
		});

	const cancelAllOrdersAfter = async (timeoutInSeconds) =>
		makePrivateRequest({
			method: 'POST',
			endpoint: '/derivatives/api/v3/cancelallordersafter',
			data: { timeout: timeoutInSeconds },
		});

	const getLeveragePreferences = async () =>
		makePrivateRequest({
			endpoint: '/derivatives/api/v3/leveragepreferences',
		});

	const setLeveragePreferences = async ({ symbol, maxLeverage }) =>
		makePrivateRequest({
			method: 'PUT',
			endpoint: `/derivatives/api/v3/leveragepreferences`,
			data: { symbol, maxLeverage },
		});

	return {
		getTickers,
		getTickerBySymbol,
		getInstruments,
		getAccounts,
		getOpenPositions,
		getOpenOrders,
		sendOrder,
		batchOrder,
		editOrder,
		cancelOrder,
		cancelAllOrders,
		cancelAllOrdersAfter,
		getLeveragePreferences,
		setLeveragePreferences,
	};
};

module.exports = KrakenFuturesApiClientV3;
