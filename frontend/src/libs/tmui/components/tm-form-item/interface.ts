export interface rulesItem {
    message: string;
    required?: boolean;
    validator?: boolean | ((val: any) => boolean | Promise<boolean>);
    [key: string]: any;
}

export interface inputPushItem {
    [key: string]: any;
}
