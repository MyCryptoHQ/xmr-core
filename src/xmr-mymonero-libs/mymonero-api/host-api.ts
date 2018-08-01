import { makeRequest, withUserAgentParams } from "./request-utils";
import { myMoneroConfig } from "../mymonero-config";
import { config } from "xmr-constants";
import {
	parseAddressInfo,
	parseAddressTransactions,
	parseUnspentOutputs,
} from "./response-parsers";
import { HWDevice } from "xmr-device/types";
import { BigInt } from "biginteger";
import { Output } from "xmr-types";
import { ERR } from "xmr-mymonero-libs/mymonero-send-tx/internal_libs/errors";

export class MyMoneroApi {
	public static async login(address: string, privViewKey: string) {
		const parameters = {
			address,
			view_key: privViewKey,
			create_account: true,
		};

		const data = await makeRequest(
			myMoneroConfig.hostName,
			"login",
			parameters,
		);

		return data.new_address;
	}

	public static async addressInfo(
		address: string,
		privViewKey: string,
		pubSpendKey: string,
		privSpendKey: string,
		hwdev: HWDevice,
	) {
		const parameters = {
			address,
			view_key: privViewKey,
		};

		const data = await makeRequest(
			myMoneroConfig.hostName,
			"get_address_info",
			parameters,
		);

		return parseAddressInfo(
			address,
			data,
			privViewKey,
			pubSpendKey,
			privSpendKey,
			hwdev,
		);
	}
	public static async addressTransactions(
		address: string,
		privViewKey: string,
		pubSpendKey: string,
		privSpendKey: string,
		hwdev: HWDevice,
	) {
		const parameters = {
			address,
			view_key: privViewKey,
		};

		const data = await makeRequest(
			myMoneroConfig.hostName,
			"get_address_txs",
			parameters,
		);

		return parseAddressTransactions(
			address,
			data,
			privViewKey,
			pubSpendKey,
			privSpendKey,
			hwdev,
		);
	}

	// Getting wallet txs import info
	public static async importRequestInfoAndStatus(
		address: string,
		privViewKey: string,
	) {
		const parameters = withUserAgentParams({
			address,
			view_key: privViewKey,
		});

		const data = await makeRequest(
			myMoneroConfig.hostName,
			"import_wallet_request",
			parameters,
		);

		return {
			payment_id: data.payment_id,
			payment_address: data.payment_address,
			import_fee: new BigInt(data.import_fee),
			feeReceiptStatus: data.feeReceiptStatus,
		};
	}

	// Getting outputs for sending funds
	public static async unspentOutputs(
		address: string,
		privViewKey: string,
		pubSpendKey: string,
		privSpendKey: string,
		mixinNumber: number,
		hwdev: HWDevice,
	) {
		const parameters = withUserAgentParams({
			address,
			view_key: privViewKey,
			amount: "0",
			mixin: mixinNumber,
			use_dust: true, // Client now filters unmixable by dustthreshold amount (unless sweeping) + non-rc
			dust_threshold: config.dustThreshold.toString(),
		});

		const data = await makeRequest(
			myMoneroConfig.hostName,
			"get_unspent_outs",
			parameters,
		);

		return parseUnspentOutputs(
			address,
			data,
			privViewKey,
			pubSpendKey,
			privSpendKey,
			hwdev,
		);
	}

	public static async randomOutputs(usingOuts: Output[], mixin: number) {
		if (mixin < 0 || isNaN(mixin)) {
			throw Error("Invalid mixin - must be >= 0");
		}

		const amounts = usingOuts.map(o => (o.rct ? "0" : o.amount.toString()));

		const parameters = withUserAgentParams({
			amounts,
			count: mixin + 1, // Add one to mixin so we can skip real output key if necessary
		});

		const data = await makeRequest(
			myMoneroConfig.hostName,
			"get_random_outs",
			parameters,
		);

		return { amount_outs: data.amount_outs };
	}

	public static async submitSerializedSignedTransaction(
		address: string,
		privViewKey: string,
		serializedSignedTx: string,
	) {
		const parameters = withUserAgentParams({
			address,
			view_key: privViewKey,
			tx: serializedSignedTx,
		});
		try {
			return await makeRequest(
				myMoneroConfig.hostName,
				"submit_raw_tx",
				parameters,
			);
		} catch (e) {
			throw ERR.TX.submitUnknown(e);
		}
	}
}