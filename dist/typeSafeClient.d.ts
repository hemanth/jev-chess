import { choice, score, noul, type Questions, type SystemOneRequest, type SystemOneResult } from "@typesafe-ai/sdk";
export { choice, score, noul };
export interface ITypeSafeClient {
    systemOne<const Q extends Questions>(request: SystemOneRequest<Q>): Promise<SystemOneResult<Q>>;
    readonly isLive: boolean;
}
export declare function getTypeSafeClient(): ITypeSafeClient;
//# sourceMappingURL=typeSafeClient.d.ts.map