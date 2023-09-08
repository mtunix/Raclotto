import {createSlice} from "@reduxjs/toolkit";
import {RaclottoSession} from "./model/RaclottoSession";

type State = {
    session: RaclottoSession | undefined;
}

export const appSlice = createSlice({
    name: 'app',
    initialState: {
        session: undefined,
    } as State,
    reducers: {
        setSession: (state, action) => {
            state.session = action.payload;
        }
    }
});

export const {
    setSession,
} = appSlice.actions;

export default appSlice.reducer;