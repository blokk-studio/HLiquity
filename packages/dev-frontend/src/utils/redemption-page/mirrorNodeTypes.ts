/**
 * Type alias for the Mirror Node API client used by useMirrorNodeClient().
 */
import type { Client } from "openapi-fetch";
import type { paths } from "../../../.mirror-node";

export type MirrorNodeClient = Client<paths>;
