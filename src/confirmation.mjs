// Confirm over HTTPS so restricted environments do not require a WebSocket.
export function installHttpConfirmation(connection, timeoutMs = 45000) {
  connection.confirmTransaction = async (strategy) => {
    const signature =
      typeof strategy === "string" ? strategy : strategy.signature;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const result = await connection.getSignatureStatuses([signature], {
        searchTransactionHistory: true,
      });
      const status = result.value[0];
      if (
        status &&
        (status.err ||
          status.confirmationStatus === "confirmed" ||
          status.confirmationStatus === "finalized")
      )
        return { context: result.context, value: { err: status.err } };
      if (
        typeof strategy !== "string" &&
        strategy.lastValidBlockHeight &&
        (await connection.getBlockHeight("confirmed")) >
          strategy.lastValidBlockHeight
      )
        throw new Error(
          "Transaction expired before confirmation. Inspect its signature before retrying: " +
            signature,
        );
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error(
      "Confirmation timed out. The transaction may still confirm. Inspect its signature before retrying: " +
        signature,
    );
  };
  return connection;
}
